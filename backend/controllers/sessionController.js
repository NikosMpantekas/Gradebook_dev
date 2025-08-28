const asyncHandler = require('express-async-handler');
const sessionService = require('../services/sessionService');
const { attachAuditContext } = require('../middleware/auditLogMiddleware');

/**
 * @desc    Generate sessions for a class
 * @route   POST /api/classes/:classId/sessions/generate
 * @access  Private (Teacher/Admin)
 */
const generateSessions = asyncHandler(async (req, res) => {
  try {
    const { classId } = req.params;
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Start date (from) and end date (to) are required'
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role,
      clientInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const result = await sessionService.generateSessions(classId, from, to, auditContext);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in generateSessions:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get sessions for a class
 * @route   GET /api/classes/:classId/sessions
 * @access  Private (Teacher/Admin/Student)
 */
const getClassSessions = asyncHandler(async (req, res) => {
  try {
    const { classId } = req.params;
    const { from, to, status, limit } = req.query;
    
    const filters = {
      ...(from && { from }),
      ...(to && { to }),
      ...(status && { status }),
      ...(limit && { limit: parseInt(limit) })
    };

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await sessionService.getClassSessions(classId, filters, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in getClassSessions:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get single session by ID
 * @route   GET /api/sessions/:id
 * @access  Private (Teacher/Admin/Student)
 */
const getSession = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await sessionService.getSession(id, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in getSession:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Update session details
 * @route   PATCH /api/sessions/:id
 * @access  Private (Teacher/Admin)
 */
const updateSession = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validate required fields for admin overrides
    if (req.user.role === 'admin' && updateData.status) {
      if (!updateData.reasonCode || !updateData.reasonText) {
        return res.status(400).json({
          success: false,
          message: 'Admin updates require reasonCode and reasonText'
        });
      }
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role,
      clientInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const result = await sessionService.updateSession(id, updateData, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in updateSession:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Postpone a session
 * @route   POST /api/sessions/:id/postpone
 * @access  Private (Teacher/Admin)
 */
const postponeSession = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { newScheduledStartAt, newScheduledEndAt, reason } = req.body;
    
    if (!newScheduledStartAt || !newScheduledEndAt || !reason) {
      return res.status(400).json({
        success: false,
        message: 'newScheduledStartAt, newScheduledEndAt, and reason are required'
      });
    }

    const postponeData = {
      newScheduledStartAt,
      newScheduledEndAt,
      reason
    };

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role,
      clientInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const result = await sessionService.postponeSession(id, postponeData, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in postponeSession:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Cancel a session
 * @route   POST /api/sessions/:id/cancel
 * @access  Private (Teacher/Admin)
 */
const cancelSession = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const cancelData = { reason };

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role,
      clientInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const result = await sessionService.cancelSession(id, cancelData, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[SESSION_CONTROLLER] Error in cancelSession:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = {
  generateSessions,
  getClassSessions,
  getSession,
  updateSession,
  postponeSession,
  cancelSession
};
