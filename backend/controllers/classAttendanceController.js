const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Class = require('../models/classModel');
const User = require('../models/userModel');
const Attendance = require('../models/attendanceModel');
const Session = require('../models/sessionModel');
const logger = require('../utils/logger');

// @desc    Save class session attendance
// @route   POST /api/attendance/class-session
// @access  Private (Admin, Teacher)
const saveClassSessionAttendance = asyncHandler(async (req, res) => {
  const { classId, date, wasHeld, startTime, endTime, students, notes } = req.body;

  logger.info('CLASS_ATTENDANCE', 'Saving class session attendance', {
    userId: req.user._id,
    classId,
    date,
    wasHeld,
    studentsCount: students?.length || 0
  });

  try {
    // Validate class exists and user has access
    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Check if user is admin or teacher of this class
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isTeacherOfClass = classData.teachers.includes(req.user._id);
    
    if (!isAdmin && !isTeacherOfClass) {
      res.status(403);
      throw new Error('Not authorized to manage attendance for this class');
    }

    // Parse the date and create session timing
    const sessionDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':');
    const [endHour, endMinute] = endTime.split(':');
    
    const scheduledStart = new Date(sessionDate);
    scheduledStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const scheduledEnd = new Date(sessionDate);
    scheduledEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    // Find or create session for this class and date
    let session = await Session.findOne({
      classId,
      scheduledStartAt: scheduledStart
    });

    if (!session) {
      // Create new session
      session = new Session({
        classId,
        schoolId: classData.schoolId,
        scheduledStartAt: scheduledStart,
        scheduledEndAt: scheduledEnd,
        status: wasHeld ? 'held' : 'planned',
        notes: notes || '',
        teacherId: req.user._id
      });
      await session.save();
      logger.info('CLASS_ATTENDANCE', 'Created new session', { sessionId: session._id });
    } else {
      // Update existing session
      session.status = wasHeld ? 'held' : 'planned';
      session.scheduledEndAt = scheduledEnd;
      session.notes = notes || '';
      if (wasHeld) {
        session.actualStartAt = scheduledStart;
        session.actualEndAt = scheduledEnd;
      }
      await session.save();
      logger.info('CLASS_ATTENDANCE', 'Updated existing session', { sessionId: session._id });
    }

    // Process student attendance if class was held
    if (wasHeld && students && students.length > 0) {
      const attendancePromises = students.map(async (studentData) => {
        try {
          // Verify student exists
          const student = await User.findById(studentData.studentId);
          if (!student || student.role !== 'student') {
            logger.warn('CLASS_ATTENDANCE', 'Invalid student ID', { studentId: studentData.studentId });
            return null;
          }

          // Upsert attendance record
          const attendanceRecord = await Attendance.upsertAttendance({
            sessionId: session._id,
            studentId: studentData.studentId,
            status: studentData.present ? 'present' : 'absent',
            note: studentData.note || '',
            source: 'manual',
            markedBy: req.user._id
          });

          return attendanceRecord;
        } catch (error) {
          logger.error('CLASS_ATTENDANCE', 'Error processing student attendance', {
            studentId: studentData.studentId,
            error: error.message
          });
          return null;
        }
      });

      const attendanceResults = await Promise.all(attendancePromises);
      const successfulAttendances = attendanceResults.filter(result => result !== null);
      
      logger.info('CLASS_ATTENDANCE', 'Processed student attendances', {
        total: students.length,
        successful: successfulAttendances.length,
        sessionId: session._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Class attendance saved successfully',
      session: {
        _id: session._id,
        status: session.status,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt
      }
    });

  } catch (error) {
    logger.error('CLASS_ATTENDANCE', 'Error saving class attendance', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      classId,
      date
    });
    throw error;
  }
});

// @desc    Get class attendance for a specific date
// @route   GET /api/attendance/class-session/:classId/:date
// @access  Private (Admin, Teacher, Student)
const getClassSessionAttendance = asyncHandler(async (req, res) => {
  const { classId, date } = req.params;

  try {
    // Find session for this class and date
    const sessionDate = new Date(date);
    const sessions = await Session.find({
      classId,
      scheduledStartAt: {
        $gte: new Date(sessionDate.setHours(0, 0, 0, 0)),
        $lt: new Date(sessionDate.setHours(23, 59, 59, 999))
      }
    }).populate('classId');

    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        session: null,
        attendance: []
      });
    }

    // Get the first session (there should typically be only one per day per class)
    const session = sessions[0];

    // Get attendance records for this session
    const attendance = await Attendance.getSessionAttendance(session._id, {
      populate: true,
      includeMarkedBy: true
    });

    res.status(200).json({
      success: true,
      session: {
        _id: session._id,
        status: session.status,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        actualStartAt: session.actualStartAt,
        actualEndAt: session.actualEndAt,
        notes: session.notes
      },
      attendance
    });

  } catch (error) {
    logger.error('CLASS_ATTENDANCE', 'Error getting class attendance', {
      error: error.message,
      classId,
      date
    });
    res.status(500);
    throw new Error('Failed to get class attendance');
  }
});

// @desc    Get student attendance data 
// @route   GET /api/attendance/student/:studentId
// @access  Private (Admin, Teacher, Student)
const getStudentAttendanceData = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { classId, startDate, endDate } = req.query;

  try {
    // Check if user can view this student's attendance
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwnData = req.user._id.toString() === studentId;
    
    if (!isAdmin && !isOwnData) {
      res.status(403);
      throw new Error('Not authorized to view this attendance data');
    }

    // Build query conditions
    const matchConditions = {
      studentId: new mongoose.Types.ObjectId(studentId),
      schoolId: req.user.schoolId
    };

    if (classId) {
      matchConditions.classId = new mongoose.Types.ObjectId(classId);
    }

    // Get attendance records with session and class data
    const attendanceData = await Attendance.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $unwind: { path: '$session', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$class', preserveNullAndEmptyArrays: true }
      },
      {
        $match: startDate && endDate ? {
          'session.scheduledStartAt': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        } : {}
      },
      {
        $sort: { 'session.scheduledStartAt': -1 }
      },
      {
        $project: {
          _id: 1,
          status: 1,
          markedAt: 1,
          note: 1,
          session: {
            _id: '$session._id',
            scheduledStartAt: '$session.scheduledStartAt',
            scheduledEndAt: '$session.scheduledEndAt',
            status: '$session.status'
          },
          class: {
            _id: '$class._id',
            name: '$class.name',
            subject: '$class.subject',
            schoolBranch: '$class.schoolBranch'
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      attendance: attendanceData
    });

  } catch (error) {
    logger.error('STUDENT_ATTENDANCE', 'Error getting student attendance', {
      error: error.message,
      studentId,
      userId: req.user._id
    });
    throw error;
  }
});

// @desc    Search students for temporary assignment
// @route   GET /api/attendance/students/search
// @access  Private (Admin, Teacher)
const searchStudents = asyncHandler(async (req, res) => {
  const { query, role = 'student' } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }

  try {
    // Search for students by name or email
    const students = await User.find({
      role: role,
      schoolId: req.user.schoolId,
      active: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('_id name email').limit(10);

    res.status(200).json({
      success: true,
      students
    });

  } catch (error) {
    logger.error('STUDENT_SEARCH', 'Error searching students', {
      error: error.message,
      query,
      userId: req.user._id
    });
    res.status(500);
    throw new Error('Failed to search students');
  }
});

// @desc    Get attendance statistics for export
// @route   GET /api/reports/attendance/export
// @access  Private (Admin)
const exportAttendanceReport = asyncHandler(async (req, res) => {
  const { type, filterId, startDate, endDate } = req.query;

  logger.info('ATTENDANCE_EXPORT', 'Generating attendance export', {
    userId: req.user._id,
    type,
    filterId,
    startDate,
    endDate
  });

  try {
    let attendanceData = [];
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    switch (type) {
      case 'all':
        // Export all attendance data
        attendanceData = await Attendance.aggregate([
          {
            $lookup: {
              from: 'sessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session'
            }
          },
          {
            $lookup: {
              from: 'classes',
              localField: 'classId',
              foreignField: '_id',
              as: 'class'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'studentId',
              foreignField: '_id',
              as: 'student'
            }
          },
          {
            $match: {
              schoolId: req.user.schoolId,
              'session.scheduledStartAt': { $gte: start, $lte: end }
            }
          },
          {
            $project: {
              'class.name': 1,
              'class.subject': 1,
              'class.direction': 1,
              'class.schoolBranch': 1,
              'student.name': 1,
              'student.email': 1,
              'session.scheduledStartAt': 1,
              status: 1,
              markedAt: 1,
              note: 1
            }
          }
        ]);
        break;

      case 'class':
        if (!filterId) {
          res.status(400);
          throw new Error('Class ID required for class export');
        }
        // Export attendance for specific class
        attendanceData = await Attendance.aggregate([
          {
            $match: {
              classId: new mongoose.Types.ObjectId(filterId),
              schoolId: req.user.schoolId
            }
          },
          {
            $lookup: {
              from: 'sessions',
              localField: 'sessionId',
              foreignField: '_id',
              as: 'session'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'studentId',
              foreignField: '_id',
              as: 'student'
            }
          },
          {
            $match: {
              'session.scheduledStartAt': { $gte: start, $lte: end }
            }
          }
        ]);
        break;

      case 'student':
        if (!filterId) {
          res.status(400);
          throw new Error('Student ID required for student export');
        }
        // Export attendance for specific student
        attendanceData = await Attendance.getStudentAttendance(filterId, start, end, {
          populate: true
        });
        break;

      default:
        res.status(400);
        throw new Error('Invalid export type');
    }

    // For now, return JSON data (in production, this would generate Excel/CSV)
    res.status(200).json({
      success: true,
      message: 'Export data generated successfully',
      data: attendanceData,
      metadata: {
        type,
        filterId,
        startDate: start,
        endDate: end,
        recordCount: attendanceData.length
      }
    });

  } catch (error) {
    logger.error('ATTENDANCE_EXPORT', 'Error generating export', {
      error: error.message,
      type,
      filterId,
      userId: req.user._id
    });
    throw error;
  }
});

// @desc    Get class attendance for a specific date
// @route   GET /api/attendance/class-attendance
// @access  Private (Admin, Teacher)
const getClassAttendanceByDate = asyncHandler(async (req, res) => {
  const { classId, date } = req.query;

  logger.info('CLASS_ATTENDANCE', 'Fetching class attendance for date', {
    userId: req.user._id,
    classId,
    date
  });

  try {
    // Validate class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Check authorization
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isTeacherOfClass = classData.teachers.includes(req.user._id);
    
    if (!isAdmin && !isTeacherOfClass) {
      res.status(403);
      throw new Error('Not authorized to view attendance for this class');
    }

    // Parse date and find session for this date
    const sessionDate = new Date(date);
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find sessions for this class and date
    const sessions = await Session.find({
      class: classId,
      scheduledStart: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No session found for this date'
      });
    }

    // Get the session (use the first one if multiple)
    const session = sessions[0];

    // Find attendance records for this session
    const attendanceRecords = await Attendance.find({
      sessionId: session._id
    }).populate('studentId', 'fullName email');

    // Format the response with attendance data
    const attendanceData = {
      sessionId: session._id,
      wasHeld: session.status === 'held',
      startTime: session.scheduledStart ? 
        `${session.scheduledStart.getHours().toString().padStart(2, '0')}:${session.scheduledStart.getMinutes().toString().padStart(2, '0')}` : '',
      endTime: session.scheduledEnd ? 
        `${session.scheduledEnd.getHours().toString().padStart(2, '0')}:${session.scheduledEnd.getMinutes().toString().padStart(2, '0')}` : '',
      students: attendanceRecords.map(record => ({
        studentId: record.studentId._id,
        present: record.status === 'present',
        note: record.note || '',
        studentName: record.studentId.fullName
      })),
      notes: session.notes || ''
    };

    res.json({
      success: true,
      data: attendanceData,
      message: 'Class attendance retrieved successfully'
    });

  } catch (error) {
    logger.error('CLASS_ATTENDANCE', 'Error fetching class attendance', {
      userId: req.user._id,
      classId,
      date,
      error: error.message
    });
    
    res.status(500);
    throw new Error('Failed to fetch class attendance');
  }
});

// @desc    Get processed classes for a date range
// @route   GET /api/attendance/processed-classes
// @access  Private (Admin, Teacher)
const getProcessedClasses = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Find all sessions with attendance in the date range
    const sessions = await Session.find({
      scheduledStart: { $gte: start, $lte: end },
      status: 'held'
    }).populate('class');

    // Check if user has access to these classes
    const accessibleSessions = sessions.filter(session => {
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
      const isTeacherOfClass = session.class.teachers.includes(req.user._id);
      return isAdmin || isTeacherOfClass;
    });

    const processedClasses = accessibleSessions.map(session => ({
      classId: session.class._id,
      date: session.scheduledStart.toISOString().split('T')[0]
    }));

    res.json({
      success: true,
      data: processedClasses,
      message: 'Processed classes retrieved successfully'
    });

  } catch (error) {
    logger.error('CLASS_ATTENDANCE', 'Error fetching processed classes', {
      userId: req.user._id,
      startDate,
      endDate,
      error: error.message
    });
    
    res.status(500);
    throw new Error('Failed to fetch processed classes');
  }
});

module.exports = {
  saveClassSessionAttendance,
  getClassAttendance,
  getClassAttendanceByDate,
  getProcessedClasses,
  getStudentAttendanceData,
  searchStudents,
  exportAttendanceReport
};
