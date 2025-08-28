const asyncHandler = require('express-async-handler');
const attendanceService = require('../services/attendanceService');

/**
 * @desc    Mark attendance for a student
 * @route   PUT /api/sessions/:sessionId/attendance/:studentId
 * @access  Private (Teacher/Admin)
 */
const markAttendance = asyncHandler(async (req, res) => {
  try {
    const { sessionId, studentId } = req.params;
    const attendanceData = req.body;
    
    // Validate required fields
    if (!attendanceData.status) {
      return res.status(400).json({
        success: false,
        message: 'Attendance status is required'
      });
    }

    const validStatuses = ['present', 'absent', 'late', 'excused', 'remote'];
    if (!validStatuses.includes(attendanceData.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
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

    const result = await attendanceService.markAttendance(
      sessionId, 
      studentId, 
      attendanceData, 
      auditContext
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in markAttendance:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get attendance for a session
 * @route   GET /api/sessions/:sessionId/attendance
 * @access  Private (Teacher/Admin/Student)
 */
const getSessionAttendance = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await attendanceService.getSessionAttendance(sessionId, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in getSessionAttendance:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get student attendance history
 * @route   GET /api/attendance/student/:studentId
 * @access  Private (Teacher/Admin/Student - own records)
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params;
    const { from, to, classId } = req.query;
    
    // Students can only view their own attendance
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own attendance records'
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Start date (from) and end date (to) are required'
      });
    }

    const options = {
      ...(classId && { classId })
    };

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await attendanceService.getStudentAttendance(
      studentId, 
      from, 
      to, 
      options, 
      auditContext
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in getStudentAttendance:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Bulk mark attendance for multiple students
 * @route   POST /api/sessions/:sessionId/attendance/bulk
 * @access  Private (Teacher/Admin)
 */
const bulkMarkAttendance = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendanceList } = req.body;
    
    if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'attendanceList must be a non-empty array'
      });
    }

    // Validate each attendance record
    const validStatuses = ['present', 'absent', 'late', 'excused', 'remote'];
    for (const attendance of attendanceList) {
      if (!attendance.studentId || !attendance.status) {
        return res.status(400).json({
          success: false,
          message: 'Each attendance record must have studentId and status'
        });
      }
      
      if (!validStatuses.includes(attendance.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${attendance.status}". Must be one of: ${validStatuses.join(', ')}`
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

    const result = await attendanceService.bulkMarkAttendance(
      sessionId, 
      attendanceList, 
      auditContext
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in bulkMarkAttendance:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Mark all students as present in a session
 * @route   POST /api/sessions/:sessionId/attendance/all-present
 * @access  Private (Teacher/Admin)
 */
const markAllPresent = asyncHandler(async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role,
      clientInfo: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const result = await attendanceService.markAllPresent(sessionId, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in markAllPresent:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Apply late policy to class attendance
 * @route   POST /api/classes/:classId/attendance/apply-late-policy
 * @access  Private (Admin)
 */
const applyLatePolicy = asyncHandler(async (req, res) => {
  try {
    const { classId } = req.params;
    const { lateThresholdMinutes = 15 } = req.body;
    
    // Only admins can apply policies
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can apply attendance policies'
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

    const result = await attendanceService.applyLatePolicy(
      classId, 
      lateThresholdMinutes, 
      auditContext
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[ATTENDANCE_CONTROLLER] Error in applyLatePolicy:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  bulkMarkAttendance,
  markAllPresent,
  applyLatePolicy
};
