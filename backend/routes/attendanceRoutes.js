const express = require('express');
const {
  markAttendance,
  getSessionAttendance,
  getStudentAttendance,
  bulkMarkAttendance,
  markAllPresent,
  applyLatePolicy
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { attachAuditContext } = require('../middleware/auditLogMiddleware');

const router = express.Router();

// Apply protection and audit context to all routes
router.use(protect);
router.use(attachAuditContext);

// Attendance management routes
router.put('/sessions/:sessionId/attendance/:studentId', authorize('teacher', 'admin', 'superadmin'), markAttendance);
router.get('/sessions/:sessionId/attendance', authorize('teacher', 'admin', 'superadmin', 'student'), getSessionAttendance);
router.get('/attendance/student/:studentId', authorize('teacher', 'admin', 'superadmin', 'student'), getStudentAttendance);
router.post('/sessions/:sessionId/attendance/bulk', authorize('teacher', 'admin', 'superadmin'), bulkMarkAttendance);
router.post('/sessions/:sessionId/attendance/all-present', authorize('teacher', 'admin', 'superadmin'), markAllPresent);
router.post('/classes/:classId/attendance/apply-late-policy', authorize('admin', 'superadmin'), applyLatePolicy);

module.exports = router;
