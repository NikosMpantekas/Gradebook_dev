const express = require('express');
const {
  generateSessions,
  getClassSessions,
  getSession,
  updateSession,
  postponeSession,
  cancelSession
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { attachAuditContext } = require('../middleware/auditLogMiddleware');

const router = express.Router();

// Apply protection and audit context to all routes
router.use(protect);
router.use(attachAuditContext);

// Session management routes
router.post('/classes/:classId/sessions/generate', authorize('teacher', 'admin', 'superadmin'), generateSessions);
router.get('/classes/:classId/sessions', authorize('teacher', 'admin', 'superadmin', 'student'), getClassSessions);
router.get('/sessions/:id', authorize('teacher', 'admin', 'superadmin', 'student'), getSession);
router.patch('/sessions/:id', authorize('teacher', 'admin', 'superadmin'), updateSession);
router.post('/sessions/:id/postpone', authorize('teacher', 'admin', 'superadmin'), postponeSession);
router.post('/sessions/:id/cancel', authorize('teacher', 'admin', 'superadmin'), cancelSession);

module.exports = router;
