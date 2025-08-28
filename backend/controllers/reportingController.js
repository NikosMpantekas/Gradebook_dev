const asyncHandler = require('express-async-handler');
const reportingService = require('../services/reportingService');

/**
 * @desc    Get daily attendance report
 * @route   GET /api/reports/attendance/daily
 * @access  Private (Teacher/Admin)
 */
const getDailyReport = asyncHandler(async (req, res) => {
  try {
    const { date, classId } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await reportingService.getDailyReport(date, classId, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[REPORTING_CONTROLLER] Error in getDailyReport:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get student attendance report
 * @route   GET /api/reports/attendance/student
 * @access  Private (Teacher/Admin/Student - own records)
 */
const getStudentReport = asyncHandler(async (req, res) => {
  try {
    const { studentId, from, to } = req.query;
    
    if (!studentId || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'studentId, from, and to parameters are required'
      });
    }

    // Students can only view their own reports
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own attendance reports'
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await reportingService.getStudentReport(studentId, from, to, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[REPORTING_CONTROLLER] Error in getStudentReport:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get class attendance report
 * @route   GET /api/reports/attendance/class
 * @access  Private (Teacher/Admin)
 */
const getClassReport = asyncHandler(async (req, res) => {
  try {
    const { classId, from, to } = req.query;
    
    if (!classId || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'classId, from, and to parameters are required'
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await reportingService.getClassReport(classId, from, to, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[REPORTING_CONTROLLER] Error in getClassReport:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Export report to CSV
 * @route   GET /api/reports/attendance/export
 * @access  Private (Teacher/Admin)
 */
const exportReport = asyncHandler(async (req, res) => {
  try {
    const { type, date, studentId, classId, from, to } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Report type is required'
      });
    }

    const validTypes = ['daily', 'student', 'class'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    let reportData;

    // Generate the appropriate report first
    switch (type) {
      case 'daily':
        if (!date) {
          return res.status(400).json({
            success: false,
            message: 'Date parameter is required for daily reports'
          });
        }
        const dailyResult = await reportingService.getDailyReport(date, classId, auditContext);
        reportData = dailyResult.data;
        break;

      case 'student':
        if (!studentId || !from || !to) {
          return res.status(400).json({
            success: false,
            message: 'studentId, from, and to parameters are required for student reports'
          });
        }
        
        // Students can only export their own reports
        if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
          return res.status(403).json({
            success: false,
            message: 'Students can only export their own attendance reports'
          });
        }
        
        const studentResult = await reportingService.getStudentReport(studentId, from, to, auditContext);
        reportData = studentResult.data;
        break;

      case 'class':
        if (!classId || !from || !to) {
          return res.status(400).json({
            success: false,
            message: 'classId, from, and to parameters are required for class reports'
          });
        }
        const classResult = await reportingService.getClassReport(classId, from, to, auditContext);
        reportData = classResult.data;
        break;
    }

    // Export to CSV
    const csvResult = await reportingService.exportToCSV(type, reportData);
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${csvResult.data.filename}"`);
    
    res.status(200).send(csvResult.data.csv);
  } catch (error) {
    console.error('[REPORTING_CONTROLLER] Error in exportReport:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * @desc    Get attendance summary statistics for a class
 * @route   GET /api/reports/attendance/summary
 * @access  Private (Teacher/Admin)
 */
const getSummaryStats = asyncHandler(async (req, res) => {
  try {
    const { classId, from, to } = req.query;
    
    if (!classId || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'classId, from, and to parameters are required'
      });
    }

    const auditContext = {
      actorUserId: req.user._id,
      schoolId: req.user.schoolId,
      userRole: req.user.role
    };

    const result = await reportingService.getSummaryStats(classId, from, to, auditContext);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('[REPORTING_CONTROLLER] Error in getSummaryStats:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = {
  getDailyReport,
  getStudentReport,
  getClassReport,
  exportReport,
  getSummaryStats
};
