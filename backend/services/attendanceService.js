const Attendance = require('../models/attendanceModel');
const Session = require('../models/sessionModel');
const Class = require('../models/classModel');
const AuditLog = require('../models/auditLogModel');
const { setDocumentAuditContext } = require('../middleware/auditLogMiddleware');

class AttendanceService {
  /**
   * Mark attendance for a student in a session (idempotent upsert)
   */
  async markAttendance(sessionId, studentId, attendanceData, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Marking attendance for student ${studentId} in session ${sessionId}`);
      
      // Validate session exists and is accessible
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      }).populate('classId');

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if session allows attendance marking
      if (session.status === 'canceled') {
        const error = new Error('Cannot mark attendance on canceled session');
        error.statusCode = 409;
        throw error;
      }

      // Validate student is enrolled in the class
      const classData = session.classId;
      if (!classData.students.includes(studentId)) {
        const error = new Error('Student is not enrolled in this class');
        error.statusCode = 403;
        throw error;
      }

      // Check edit permissions for teachers
      if (auditContext.userRole === 'teacher') {
        const editCheck = this.canEditAttendance(session, auditContext.userRole);
        if (!editCheck.canEdit) {
          const error = new Error(editCheck.reason);
          error.statusCode = 403;
          throw error;
        }
      }

      // Prepare attendance data
      const upsertData = {
        sessionId,
        studentId,
        status: attendanceData.status,
        minutesPresent: attendanceData.minutesPresent || null,
        lateMinutes: attendanceData.lateMinutes || null,
        note: attendanceData.note || '',
        source: attendanceData.source || 'manual',
        markedBy: auditContext.actorUserId
      };

      // Apply late policy if configured
      if (attendanceData.status === 'late' && attendanceData.lateMinutes) {
        const lateThreshold = classData.lateThresholdMinutes || 15;
        if (attendanceData.lateMinutes > lateThreshold) {
          upsertData.status = 'absent';
          upsertData.note += ` [Auto-marked absent: late by ${attendanceData.lateMinutes} minutes]`;
        }
      }

      // Use model's idempotent upsert method
      const attendance = await Attendance.upsertAttendance(upsertData);

      // Log manual audit for non-system sources
      if (upsertData.source === 'manual') {
        await AuditLog.logAction({
          entity: 'Attendance',
          entityId: attendance._id,
          schoolId: auditContext.schoolId,
          actorUserId: auditContext.actorUserId,
          operation: attendance.version === 1 ? 'create' : 'update',
          reasonCode: attendanceData.reasonCode || 'manual_correction',
          reasonText: attendanceData.reasonText || `Marked ${upsertData.status} for student`,
          changes: [
            { field: 'status', before: null, after: upsertData.status },
            { field: 'markedBy', before: null, after: auditContext.actorUserId }
          ],
          clientInfo: auditContext.clientInfo || {}
        });
      }

      return {
        success: true,
        message: `Attendance marked as ${upsertData.status}`,
        data: attendance
      };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error marking attendance:', error);
      throw error;
    }
  }

  /**
   * Get attendance records for a session
   */
  async getSessionAttendance(sessionId, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Getting attendance for session ${sessionId}`);
      
      // Verify session access
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      });

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      const attendance = await Attendance.getSessionAttendance(sessionId, { 
        populate: true, 
        includeMarkedBy: true 
      });

      // Calculate summary statistics
      const summary = this.calculateAttendanceSummary(attendance);

      return {
        success: true,
        data: {
          session: session,
          attendance: attendance,
          summary: summary
        }
      };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error getting session attendance:', error);
      throw error;
    }
  }

  /**
   * Get attendance history for a student
   */
  async getStudentAttendance(studentId, startDate, endDate, options = {}, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Getting attendance history for student ${studentId}`);
      
      // Add school filter to options
      if (auditContext.schoolId) {
        options.schoolId = auditContext.schoolId;
      }

      const attendance = await Attendance.getStudentAttendance(
        studentId, 
        startDate, 
        endDate, 
        { ...options, populate: true }
      );

      // Calculate student statistics
      const stats = this.calculateStudentStats(attendance);

      return {
        success: true,
        data: {
          attendance: attendance,
          statistics: stats,
          period: { startDate, endDate }
        }
      };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error getting student attendance:', error);
      throw error;
    }
  }

  /**
   * Bulk mark attendance for multiple students in a session
   */
  async bulkMarkAttendance(sessionId, attendanceList, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Bulk marking attendance for ${attendanceList.length} students in session ${sessionId}`);
      
      const results = [];
      const errors = [];

      // Process each attendance record
      for (const attendanceData of attendanceList) {
        try {
          const result = await this.markAttendance(
            sessionId, 
            attendanceData.studentId, 
            attendanceData, 
            auditContext
          );
          results.push(result);
        } catch (error) {
          errors.push({
            studentId: attendanceData.studentId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: `Processed ${results.length} attendance records, ${errors.length} errors`,
        data: {
          successful: results,
          errors: errors
        }
      };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error in bulk mark attendance:', error);
      throw error;
    }
  }

  /**
   * Mark all students as present (bulk present)
   */
  async markAllPresent(sessionId, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Marking all students present for session ${sessionId}`);
      
      // Get session with class data
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      }).populate('classId');

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      const students = session.classId.students;
      
      // Create attendance list for all students
      const attendanceList = students.map(studentId => ({
        studentId: studentId,
        status: 'present',
        source: 'bulk',
        reasonText: 'Bulk marked present'
      }));

      return await this.bulkMarkAttendance(sessionId, attendanceList, auditContext);
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error marking all present:', error);
      throw error;
    }
  }

  /**
   * Calculate attendance summary for a session
   */
  calculateAttendanceSummary(attendanceRecords) {
    const summary = {
      total: attendanceRecords.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      remote: 0,
      unmarked: 0
    };

    attendanceRecords.forEach(record => {
      if (summary.hasOwnProperty(record.status)) {
        summary[record.status]++;
      }
    });

    // Calculate percentages
    summary.presentRate = summary.total > 0 ? (summary.present / summary.total * 100).toFixed(1) : 0;
    summary.absentRate = summary.total > 0 ? (summary.absent / summary.total * 100).toFixed(1) : 0;

    return summary;
  }

  /**
   * Calculate student attendance statistics
   */
  calculateStudentStats(attendanceRecords) {
    const stats = {
      totalSessions: attendanceRecords.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      remote: 0,
      attendanceRate: 0,
      averageMinutesPresent: 0,
      averageLateMinutes: 0
    };

    let totalMinutesPresent = 0;
    let totalLateMinutes = 0;
    let recordsWithMinutes = 0;
    let recordsWithLateMinutes = 0;

    attendanceRecords.forEach(record => {
      if (stats.hasOwnProperty(record.status)) {
        stats[record.status]++;
      }

      if (record.minutesPresent !== null) {
        totalMinutesPresent += record.minutesPresent;
        recordsWithMinutes++;
      }

      if (record.lateMinutes !== null) {
        totalLateMinutes += record.lateMinutes;
        recordsWithLateMinutes++;
      }
    });

    // Calculate rates and averages
    if (stats.totalSessions > 0) {
      const effectivelyPresent = stats.present + stats.late + stats.remote;
      stats.attendanceRate = (effectivelyPresent / stats.totalSessions * 100).toFixed(1);
    }

    if (recordsWithMinutes > 0) {
      stats.averageMinutesPresent = (totalMinutesPresent / recordsWithMinutes).toFixed(1);
    }

    if (recordsWithLateMinutes > 0) {
      stats.averageLateMinutes = (totalLateMinutes / recordsWithLateMinutes).toFixed(1);
    }

    return stats;
  }

  /**
   * Check if user can edit attendance (time window policy)
   */
  canEditAttendance(session, userRole, windowHours = 24) {
    try {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return { canEdit: true, reason: 'Admin privileges' };
      }

      if (session.status === 'canceled') {
        return { canEdit: false, reason: 'Session is canceled' };
      }

      const now = new Date();
      const sessionEnd = session.actualEndAt || session.scheduledEndAt;
      const windowEnd = new Date(sessionEnd.getTime() + (windowHours * 60 * 60 * 1000));

      if (now > windowEnd) {
        return { 
          canEdit: false, 
          reason: `Edit window expired (${windowHours}h after session end)` 
        };
      }

      return { canEdit: true, reason: 'Within edit window' };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error checking edit permissions:', error);
      return { canEdit: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Apply late-to-absent policy to existing attendance
   */
  async applyLatePolicy(classId, lateThresholdMinutes = 15, auditContext) {
    try {
      console.log(`[ATTENDANCE_SERVICE] Applying late policy to class ${classId} with threshold ${lateThresholdMinutes} minutes`);
      
      // Find all late attendance records for the class
      const lateAttendance = await Attendance.find({
        classId: classId,
        status: 'late',
        lateMinutes: { $gt: lateThresholdMinutes },
        active: true
      });

      const updatedRecords = [];

      for (const attendance of lateAttendance) {
        const originalStatus = attendance.status;
        
        if (attendance.applyLatePolicy(lateThresholdMinutes)) {
          setDocumentAuditContext(attendance, auditContext);
          await attendance.save();

          // Log the policy application
          await AuditLog.logAction({
            entity: 'Attendance',
            entityId: attendance._id,
            schoolId: auditContext.schoolId,
            actorUserId: auditContext.actorUserId,
            operation: 'update',
            reasonCode: 'system_policy',
            reasonText: `Applied late policy: ${attendance.lateMinutes}min > ${lateThresholdMinutes}min threshold`,
            changes: [
              { field: 'status', before: originalStatus, after: attendance.status }
            ],
            clientInfo: auditContext.clientInfo || {}
          });

          updatedRecords.push(attendance);
        }
      }

      return {
        success: true,
        message: `Applied late policy to ${updatedRecords.length} records`,
        data: {
          threshold: lateThresholdMinutes,
          updatedRecords: updatedRecords.length,
          records: updatedRecords
        }
      };
    } catch (error) {
      console.error('[ATTENDANCE_SERVICE] Error applying late policy:', error);
      throw error;
    }
  }
}

module.exports = new AttendanceService();
