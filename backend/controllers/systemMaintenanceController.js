const asyncHandler = require('express-async-handler');
const SystemMaintenance = require('../models/systemMaintenanceModel');

// @desc    Get current maintenance status
// @route   GET /api/system/maintenance/status
// @access  Public (needed for maintenance check)
const getMaintenanceStatus = asyncHandler(async (req, res) => {
  try {
    console.log('[MAINTENANCE] Getting current maintenance status');
    
    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();
    
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
    }
    
    console.log('[MAINTENANCE] Status response:', {
      isMaintenanceMode: publicResponse.isMaintenanceMode,
      userRole: req.user?.role || 'anonymous',
      canBypass: publicResponse.canBypass || false
    });
    
    res.json(publicResponse);
  } catch (error) {
    console.error('[MAINTENANCE] Error getting status:', error);
    res.status(500).json({ 
      error: 'Failed to get maintenance status',
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
    await maintenanceDoc.populate('lastModifiedBy', 'name email role');
    await maintenanceDoc.populate('maintenanceHistory.modifiedBy', 'name email role');
    
    res.json(maintenanceDoc);
  } catch (error) {
    console.error('[MAINTENANCE] Error getting details:', error);
    res.status(500);
    throw new Error('Failed to get maintenance details');
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
    await maintenanceDoc.populate('maintenanceHistory.modifiedBy', 'name email role');
    
    // Sort history by timestamp (newest first)
    const sortedHistory = maintenanceDoc.maintenanceHistory.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.json({
      history: sortedHistory,
      totalEntries: sortedHistory.length
    });
  } catch (error) {
    console.error('[MAINTENANCE] Error getting history:', error);
    res.status(500);
    throw new Error('Failed to get maintenance history');
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
