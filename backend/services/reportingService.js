const Attendance = require('../models/attendanceModel');
const Session = require('../models/sessionModel');
const Class = require('../models/classModel');
const User = require('../models/userModel');

class ReportingService {
  /**
   * Generate daily attendance report for classes
   */
  async getDailyReport(date, classId = null, auditContext) {
    try {
      console.log(`[REPORTING_SERVICE] Generating daily report for ${date}`);
      
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Build aggregation pipeline
      const pipeline = [
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session'
          }
        },
        {
          $unwind: '$session'
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
          $unwind: '$class'
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
          $unwind: '$student'
        },
        {
          $match: {
            'session.scheduledStartAt': {
              $gte: startDate,
              $lte: endDate
            },
            'session.schoolId': auditContext.schoolId,
            active: true
          }
        }
      ];

      if (classId) {
        pipeline[5].$match.classId = classId;
      }

      // Add grouping for summary
      pipeline.push(
        {
          $group: {
            _id: {
              classId: '$classId',
              className: '$class.name',
              sessionId: '$sessionId',
              sessionStart: '$session.scheduledStartAt'
            },
            totalStudents: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
              }
            },
            absent: {
              $sum: {
                $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
              }
            },
            late: {
              $sum: {
                $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
              }
            },
            excused: {
              $sum: {
                $cond: [{ $eq: ['$status', 'excused'] }, 1, 0]
              }
            },
            remote: {
              $sum: {
                $cond: [{ $eq: ['$status', 'remote'] }, 1, 0]
              }
            },
            attendanceRecords: {
              $push: {
                studentId: '$studentId',
                studentName: '$student.name',
                status: '$status',
                minutesPresent: '$minutesPresent',
                lateMinutes: '$lateMinutes',
                note: '$note'
              }
            }
          }
        },
        {
          $sort: { '_id.sessionStart': 1 }
        }
      );

      const report = await Attendance.aggregate(pipeline);

      // Calculate overall statistics
      const overallStats = {
        totalSessions: report.length,
        totalStudents: report.reduce((sum, session) => sum + session.totalStudents, 0),
        overallPresent: report.reduce((sum, session) => sum + session.present, 0),
        overallAbsent: report.reduce((sum, session) => sum + session.absent, 0),
        overallLate: report.reduce((sum, session) => sum + session.late, 0),
        overallExcused: report.reduce((sum, session) => sum + session.excused, 0),
        overallRemote: report.reduce((sum, session) => sum + session.remote, 0),
      };

      overallStats.attendanceRate = overallStats.totalStudents > 0 
        ? ((overallStats.overallPresent + overallStats.overallLate + overallStats.overallRemote) / overallStats.totalStudents * 100).toFixed(1)
        : 0;

      return {
        success: true,
        data: {
          date,
          classId,
          sessions: report,
          statistics: overallStats
        }
      };
    } catch (error) {
      console.error('[REPORTING_SERVICE] Error generating daily report:', error);
      throw error;
    }
  }

  /**
   * Generate student attendance report
   */
  async getStudentReport(studentId, startDate, endDate, auditContext) {
    try {
      console.log(`[REPORTING_SERVICE] Generating student report for ${studentId} from ${startDate} to ${endDate}`);
      
      const pipeline = [
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session'
          }
        },
        {
          $unwind: '$session'
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
          $unwind: '$class'
        },
        {
          $match: {
            studentId: studentId,
            'session.scheduledStartAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            'session.schoolId': auditContext.schoolId,
            active: true
          }
        },
        {
          $sort: { 'session.scheduledStartAt': -1 }
        }
      ];

      const attendanceRecords = await Attendance.aggregate(pipeline);

      // Calculate statistics
      const stats = {
        totalSessions: attendanceRecords.length,
        present: attendanceRecords.filter(r => r.status === 'present').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
        late: attendanceRecords.filter(r => r.status === 'late').length,
        excused: attendanceRecords.filter(r => r.status === 'excused').length,
        remote: attendanceRecords.filter(r => r.status === 'remote').length,
      };

      stats.attendanceRate = stats.totalSessions > 0 
        ? ((stats.present + stats.late + stats.remote) / stats.totalSessions * 100).toFixed(1)
        : 0;

      // Group by class
      const byClass = attendanceRecords.reduce((acc, record) => {
        const classId = record.class._id.toString();
        if (!acc[classId]) {
          acc[classId] = {
            classInfo: record.class,
            sessions: [],
            stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, remote: 0 }
          };
        }
        acc[classId].sessions.push(record);
        acc[classId].stats.total++;
        acc[classId].stats[record.status]++;
        return acc;
      }, {});

      // Calculate attendance rate per class
      Object.values(byClass).forEach(classData => {
        const effectivelyPresent = classData.stats.present + classData.stats.late + classData.stats.remote;
        classData.stats.attendanceRate = classData.stats.total > 0 
          ? (effectivelyPresent / classData.stats.total * 100).toFixed(1)
          : 0;
      });

      return {
        success: true,
        data: {
          studentId,
          period: { startDate, endDate },
          overallStats: stats,
          byClass: byClass,
          allRecords: attendanceRecords
        }
      };
    } catch (error) {
      console.error('[REPORTING_SERVICE] Error generating student report:', error);
      throw error;
    }
  }

  /**
   * Generate class attendance report
   */
  async getClassReport(classId, startDate, endDate, auditContext) {
    try {
      console.log(`[REPORTING_SERVICE] Generating class report for ${classId} from ${startDate} to ${endDate}`);
      
      const pipeline = [
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session'
          }
        },
        {
          $unwind: '$session'
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
          $unwind: '$student'
        },
        {
          $match: {
            classId: classId,
            'session.scheduledStartAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            'session.schoolId': auditContext.schoolId,
            active: true
          }
        },
        {
          $sort: { 'session.scheduledStartAt': -1, 'student.name': 1 }
        }
      ];

      const attendanceRecords = await Attendance.aggregate(pipeline);

      // Get class info
      const classInfo = await Class.findById(classId).populate('teachers students');

      // Group by student
      const byStudent = attendanceRecords.reduce((acc, record) => {
        const studentId = record.student._id.toString();
        if (!acc[studentId]) {
          acc[studentId] = {
            studentInfo: record.student,
            sessions: [],
            stats: { total: 0, present: 0, absent: 0, late: 0, excused: 0, remote: 0 }
          };
        }
        acc[studentId].sessions.push(record);
        acc[studentId].stats.total++;
        acc[studentId].stats[record.status]++;
        return acc;
      }, {});

      // Calculate attendance rate per student
      Object.values(byStudent).forEach(studentData => {
        const effectivelyPresent = studentData.stats.present + studentData.stats.late + studentData.stats.remote;
        studentData.stats.attendanceRate = studentData.stats.total > 0 
          ? (effectivelyPresent / studentData.stats.total * 100).toFixed(1)
          : 0;
      });

      // Overall class statistics
      const overallStats = {
        totalSessions: new Set(attendanceRecords.map(r => r.sessionId.toString())).size,
        totalStudents: Object.keys(byStudent).length,
        totalRecords: attendanceRecords.length,
        present: attendanceRecords.filter(r => r.status === 'present').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
        late: attendanceRecords.filter(r => r.status === 'late').length,
        excused: attendanceRecords.filter(r => r.status === 'excused').length,
        remote: attendanceRecords.filter(r => r.status === 'remote').length,
      };

      overallStats.averageAttendanceRate = overallStats.totalRecords > 0 
        ? ((overallStats.present + overallStats.late + overallStats.remote) / overallStats.totalRecords * 100).toFixed(1)
        : 0;

      return {
        success: true,
        data: {
          classInfo,
          period: { startDate, endDate },
          overallStats,
          byStudent,
          allRecords: attendanceRecords
        }
      };
    } catch (error) {
      console.error('[REPORTING_SERVICE] Error generating class report:', error);
      throw error;
    }
  }

  /**
   * Export report data to CSV format
   */
  async exportToCSV(reportType, reportData, options = {}) {
    try {
      console.log(`[REPORTING_SERVICE] Exporting ${reportType} report to CSV`);
      
      let csvData = [];
      let headers = [];

      switch (reportType) {
        case 'daily':
          headers = ['Date', 'Class', 'Session Time', 'Total Students', 'Present', 'Absent', 'Late', 'Excused', 'Remote', 'Attendance Rate %'];
          
          reportData.sessions.forEach(session => {
            const attendanceRate = session.totalStudents > 0 
              ? ((session.present + session.late + session.remote) / session.totalStudents * 100).toFixed(1)
              : 0;
              
            csvData.push([
              reportData.date,
              session._id.className,
              new Date(session._id.sessionStart).toLocaleTimeString(),
              session.totalStudents,
              session.present,
              session.absent,
              session.late,
              session.excused,
              session.remote,
              attendanceRate
            ]);
          });
          break;

        case 'student':
          headers = ['Date', 'Class', 'Subject', 'Status', 'Minutes Present', 'Late Minutes', 'Note'];
          
          reportData.allRecords.forEach(record => {
            csvData.push([
              new Date(record.session.scheduledStartAt).toLocaleDateString(),
              record.class.name,
              record.class.subject,
              record.status,
              record.minutesPresent || '',
              record.lateMinutes || '',
              record.note || ''
            ]);
          });
          break;

        case 'class':
          headers = ['Student Name', 'Student Email', 'Total Sessions', 'Present', 'Absent', 'Late', 'Excused', 'Remote', 'Attendance Rate %'];
          
          Object.values(reportData.byStudent).forEach(studentData => {
            csvData.push([
              studentData.studentInfo.name,
              studentData.studentInfo.email,
              studentData.stats.total,
              studentData.stats.present,
              studentData.stats.absent,
              studentData.stats.late,
              studentData.stats.excused,
              studentData.stats.remote,
              studentData.stats.attendanceRate
            ]);
          });
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Convert to CSV string
      const csvString = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') 
              ? `"${cell}"` 
              : cell
          ).join(',')
        )
      ].join('\n');

      return {
        success: true,
        data: {
          csv: csvString,
          filename: `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`,
          headers,
          rows: csvData.length
        }
      };
    } catch (error) {
      console.error('[REPORTING_SERVICE] Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Generate attendance summary statistics
   */
  async getSummaryStats(classId, startDate, endDate, auditContext) {
    try {
      console.log(`[REPORTING_SERVICE] Generating summary stats for class ${classId}`);
      
      const pipeline = [
        {
          $lookup: {
            from: 'sessions',
            localField: 'sessionId',
            foreignField: '_id',
            as: 'session'
          }
        },
        {
          $unwind: '$session'
        },
        {
          $match: {
            classId: classId,
            'session.scheduledStartAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            'session.schoolId': auditContext.schoolId,
            active: true
          }
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            uniqueSessions: { $addToSet: '$sessionId' },
            uniqueStudents: { $addToSet: '$studentId' },
            present: {
              $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
            },
            absent: {
              $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
            },
            late: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            },
            excused: {
              $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
            },
            remote: {
              $sum: { $cond: [{ $eq: ['$status', 'remote'] }, 1, 0] }
            },
            avgMinutesPresent: {
              $avg: {
                $cond: [
                  { $ne: ['$minutesPresent', null] },
                  '$minutesPresent',
                  null
                ]
              }
            },
            avgLateMinutes: {
              $avg: {
                $cond: [
                  { $ne: ['$lateMinutes', null] },
                  '$lateMinutes',
                  null
                ]
              }
            }
          }
        }
      ];

      const result = await Attendance.aggregate(pipeline);
      const stats = result[0] || {};

      // Calculate additional metrics
      const totalAttendanceRecords = stats.totalRecords || 0;
      const effectivelyPresent = (stats.present || 0) + (stats.late || 0) + (stats.remote || 0);
      
      const summary = {
        period: { startDate, endDate },
        totalSessions: stats.uniqueSessions ? stats.uniqueSessions.length : 0,
        totalStudents: stats.uniqueStudents ? stats.uniqueStudents.length : 0,
        totalAttendanceRecords: totalAttendanceRecords,
        attendanceCounts: {
          present: stats.present || 0,
          absent: stats.absent || 0,
          late: stats.late || 0,
          excused: stats.excused || 0,
          remote: stats.remote || 0
        },
        attendanceRates: {
          overall: totalAttendanceRecords > 0 ? 
            (effectivelyPresent / totalAttendanceRecords * 100).toFixed(1) : 0,
          present: totalAttendanceRecords > 0 ? 
            ((stats.present || 0) / totalAttendanceRecords * 100).toFixed(1) : 0,
          absent: totalAttendanceRecords > 0 ? 
            ((stats.absent || 0) / totalAttendanceRecords * 100).toFixed(1) : 0
        },
        averages: {
          minutesPresent: stats.avgMinutesPresent ? stats.avgMinutesPresent.toFixed(1) : null,
          lateMinutes: stats.avgLateMinutes ? stats.avgLateMinutes.toFixed(1) : null
        }
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('[REPORTING_SERVICE] Error generating summary stats:', error);
      throw error;
    }
  }
}

module.exports = new ReportingService();
