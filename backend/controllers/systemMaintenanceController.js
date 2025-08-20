const asyncHandler = require('express-async-handler');
const SystemMaintenance = require('../models/systemMaintenanceModel');

// @desc    Get current maintenance status
// @route   GET /api/system/maintenance/status
// @access  Public (needed for maintenance check)
const getMaintenanceStatus = asyncHandler(async (req, res) => {
  try {
    console.log('[MAINTENANCE] Getting current maintenance status');
    console.log('[MAINTENANCE] Request headers:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });
    console.log('[MAINTENANCE] SystemMaintenance model available:', !!SystemMaintenance);
    console.log('[MAINTENANCE] SystemMaintenance.getCurrentStatus available:', typeof SystemMaintenance.getCurrentStatus);
    
    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();
    console.log('[MAINTENANCE] Retrieved maintenance document:', {
      exists: !!maintenanceDoc,
      isMaintenanceMode: maintenanceDoc?.isMaintenanceMode,
      message: maintenanceDoc?.maintenanceMessage?.substring(0, 50)
    });
    
    // Public response (limited info for security)
    const publicResponse = {
      isMaintenanceMode: maintenanceDoc.isMaintenanceMode,
      maintenanceMessage: maintenanceDoc.maintenanceMessage,
      estimatedCompletion: maintenanceDoc.estimatedCompletion
    };
    
    // If user is authenticated, check if they can bypass
    if (req.user) {
      publicResponse.canBypass = maintenanceDoc.canBypassMaintenance(req.user.role);
      publicResponse.userRole = req.user.role;
      console.log('[MAINTENANCE] User authenticated:', {
        userId: req.user._id,
        role: req.user.role,
        canBypass: publicResponse.canBypass
      });
    }
    
    console.log('[MAINTENANCE] Status response prepared successfully');
    res.json(publicResponse);
  } catch (error) {
    console.error('[MAINTENANCE] Error getting status - Full details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to get maintenance status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      isMaintenanceMode: false // Fail safely
    });
  }
});

// @desc    Get full maintenance details (SuperAdmin only)
// @route   GET /api/system/maintenance
// @access  Private/SuperAdmin
const getMaintenanceDetails = asyncHandler(async (req, res) => {
  try {
    console.log(`[MAINTENANCE] SuperAdmin ${req.user._id} requesting full maintenance details`);
    
    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();
    
    // Safely populate references with fallback handling
    try {
      await maintenanceDoc.populate('lastModifiedBy', 'name email role');
      await maintenanceDoc.populate('maintenanceHistory.modifiedBy', 'name email role');
    } catch (populateError) {
      console.warn('[MAINTENANCE] Populate error (non-fatal):', populateError.message);
      // Continue without population if users don't exist
    }
    
    console.log('[MAINTENANCE] Successfully retrieved maintenance details');
    res.json(maintenanceDoc);
  } catch (error) {
    console.error('[MAINTENANCE] Error getting details:', error.message);
    console.error('[MAINTENANCE] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get maintenance details',
      message: error.message
    });
  }
});

// @desc    Update maintenance mode
// @route   PUT /api/system/maintenance
// @access  Private/SuperAdmin
const updateMaintenanceMode = asyncHandler(async (req, res) => {
  try {
    const { 
      isMaintenanceMode, 
      maintenanceMessage, 
      estimatedCompletion, 
      reason,
      allowedRoles 
    } = req.body;
    
    console.log(`[MAINTENANCE] SuperAdmin ${req.user._id} updating maintenance mode:`, {
      isMaintenanceMode,
      reason,
      allowedRoles
    });
    
    // Validate inputs
    if (typeof isMaintenanceMode !== 'boolean') {
      res.status(400);
      throw new Error('isMaintenanceMode must be a boolean');
    }
    
    if (maintenanceMessage && typeof maintenanceMessage !== 'string') {
      res.status(400);
      throw new Error('maintenanceMessage must be a string');
    }
    
    if (maintenanceMessage && maintenanceMessage.length > 500) {
      res.status(400);
      throw new Error('maintenanceMessage cannot exceed 500 characters');
    }
    
    // Prepare update data
    const updateData = {
      isMaintenanceMode,
      reason: reason || ''
    };
    
    if (maintenanceMessage !== undefined) {
      updateData.maintenanceMessage = maintenanceMessage;
    }
    
    if (estimatedCompletion !== undefined) {
      updateData.estimatedCompletion = estimatedCompletion ? new Date(estimatedCompletion) : null;
    }
    
    if (allowedRoles !== undefined && Array.isArray(allowedRoles)) {
      const validRoles = ['admin', 'teacher', 'student', 'parent'];
      const filteredRoles = allowedRoles.filter(role => validRoles.includes(role));
      updateData.allowedRoles = filteredRoles;
    }
    
    // Update maintenance status
    const updatedDoc = await SystemMaintenance.updateStatus(updateData, req.user._id);
    await updatedDoc.populate('lastModifiedBy', 'name email role');
    
    console.log(`[MAINTENANCE] Maintenance mode ${isMaintenanceMode ? 'ENABLED' : 'DISABLED'} by ${req.user.name}`);
    
    res.json({
      message: `Maintenance mode ${isMaintenanceMode ? 'enabled' : 'disabled'} successfully`,
      maintenance: updatedDoc
    });
  } catch (error) {
    console.error('[MAINTENANCE] Error updating maintenance mode:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to update maintenance mode');
  }
});

// @desc    Get maintenance history
// @route   GET /api/system/maintenance/history
// @access  Private/SuperAdmin
const getMaintenanceHistory = asyncHandler(async (req, res) => {
  try {
    console.log(`[MAINTENANCE] SuperAdmin ${req.user._id} requesting maintenance history`);
    
    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();
    
    // Safely populate history references with fallback handling
    try {
      await maintenanceDoc.populate('maintenanceHistory.modifiedBy', 'name email role');
    } catch (populateError) {
      console.warn('[MAINTENANCE] History populate error (non-fatal):', populateError.message);
      // Continue without population if users don't exist
    }
    
    // Sort history by timestamp (newest first)
    const sortedHistory = maintenanceDoc.maintenanceHistory.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    console.log('[MAINTENANCE] Successfully retrieved maintenance history');
    res.json({
      history: sortedHistory,
      totalEntries: sortedHistory.length
    });
  } catch (error) {
    console.error('[MAINTENANCE] Error getting history:', error.message);
    console.error('[MAINTENANCE] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get maintenance history',
      message: error.message
    });
  }
});

// @desc    Clear maintenance history
// @route   DELETE /api/system/maintenance/history
// @access  Private/SuperAdmin
const clearMaintenanceHistory = asyncHandler(async (req, res) => {
  try {
    console.log(`[MAINTENANCE] SuperAdmin ${req.user._id} clearing maintenance history`);
    
    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();
    maintenanceDoc.maintenanceHistory = [];
    await maintenanceDoc.save();
    
    console.log('[MAINTENANCE] Maintenance history cleared');
    
    res.json({
      message: 'Maintenance history cleared successfully'
    });
  } catch (error) {
    console.error('[MAINTENANCE] Error clearing history:', error);
    res.status(500);
    throw new Error('Failed to clear maintenance history');
  }
});

module.exports = {
  getMaintenanceStatus,
  getMaintenanceDetails,
  updateMaintenanceMode,
  getMaintenanceHistory,
  clearMaintenanceHistory
};
