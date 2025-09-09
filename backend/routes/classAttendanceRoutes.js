const express = require('express');
const {
  saveClassSessionAttendance,
  getClassAttendance,
  getClassAttendanceByDate,
  getProcessedClasses,
  getStudentAttendanceData,
  searchStudents,
  exportAttendanceReport
} = require('../controllers/classAttendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { attachAuditContext } = require('../middleware/auditLogMiddleware');

const router = express.Router();

// Apply protection and audit context to all routes
router.use(protect);
router.use(attachAuditContext);

// Class session attendance routes
router.post('/class-session', authorize('admin', 'teacher', 'superadmin'), saveClassSessionAttendance);
router.get('/class-session/:classId/:date', authorize('admin', 'teacher', 'student', 'superadmin'), getClassAttendance);
router.get('/class-attendance', authorize('admin', 'teacher', 'superadmin'), getClassAttendanceByDate);
router.get('/processed-classes', authorize('admin', 'teacher', 'superadmin'), getProcessedClasses);

// Student attendance data
router.get('/student/:studentId', authorize('admin', 'teacher', 'student', 'superadmin'), getStudentAttendanceData);

// Student search for temporary assignment
router.get('/students/search', authorize('admin', 'teacher', 'superadmin'), searchStudents);

// Export routes (admin only)
router.get('/export', authorize('admin', 'superadmin'), exportAttendanceReport);

module.exports = router;
