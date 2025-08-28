const express = require('express');
const {
  getDailyReport,
  getStudentReport,
  getClassReport,
  exportReport,
  getSummaryStats
} = require('../controllers/reportingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { attachAuditContext } = require('../middleware/auditLogMiddleware');

const router = express.Router();

// Apply protection and audit context to all routes
router.use(protect);
router.use(attachAuditContext);

// Reporting routes
router.get('/reports/attendance/daily', authorize('teacher', 'admin', 'superadmin'), getDailyReport);
router.get('/reports/attendance/student', authorize('teacher', 'admin', 'superadmin', 'student'), getStudentReport);
router.get('/reports/attendance/class', authorize('teacher', 'admin', 'superadmin'), getClassReport);
router.get('/reports/attendance/export', authorize('teacher', 'admin', 'superadmin'), exportReport);
router.get('/reports/attendance/summary', authorize('teacher', 'admin', 'superadmin'), getSummaryStats);

module.exports = router;
