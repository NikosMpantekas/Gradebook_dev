const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

describe('Attendance System Integration Tests', () => {
  let app;
  let testSchoolId;
  let testUserId;
  let testClassId;
  let authToken;

  beforeAll(async () => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());

    // Import required middleware and routes
    const { protect } = require('../middleware/authMiddleware');
    const sessionRoutes = require('../routes/sessionRoutes');
    const attendanceRoutes = require('../routes/attendanceRoutes');
    const reportingRoutes = require('../routes/reportingRoutes');

    // Mock middleware for testing
    app.use('/api/sessions', (req, res, next) => {
      req.user = { _id: testUserId, role: 'teacher', schoolId: testSchoolId };
      req.schoolId = testSchoolId;
      next();
    }, sessionRoutes);

    app.use('/api/attendance', (req, res, next) => {
      req.user = { _id: testUserId, role: 'teacher', schoolId: testSchoolId };
      req.schoolId = testSchoolId;
      next();
    }, attendanceRoutes);

    app.use('/api/reports', (req, res, next) => {
      req.user = { _id: testUserId, role: 'teacher', schoolId: testSchoolId };
      req.schoolId = testSchoolId;
      next();
    }, reportingRoutes);

    // Create test data
    testSchoolId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
    testClassId = new mongoose.Types.ObjectId();
  });

  describe('Session Routes', () => {
    test('GET /api/sessions should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .expect(200);

      expect(Array.isArray(response.body.sessions || response.body)).toBe(true);
    });

    test('POST /api/sessions/generate should be accessible', async () => {
      const response = await request(app)
        .post('/api/sessions/generate')
        .send({
          classId: testClassId,
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Attendance Routes', () => {
    test('GET /api/attendance should be accessible', async () => {
      const response = await request(app)
        .get('/api/attendance');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    test('POST /api/attendance/mark should be accessible', async () => {
      const response = await request(app)
        .post('/api/attendance/mark')
        .send({
          sessionId: new mongoose.Types.ObjectId(),
          studentId: new mongoose.Types.ObjectId(),
          status: 'present'
        });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Reporting Routes', () => {
    test('GET /api/reports/daily should be accessible', async () => {
      const response = await request(app)
        .get('/api/reports/daily')
        .query({ date: '2024-01-01' });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    test('GET /api/reports/student should be accessible', async () => {
      const response = await request(app)
        .get(`/api/reports/student/${testUserId}`);

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });
});

describe('Model Registration Tests', () => {
  test('All attendance models should be registered', () => {
    // Check if models are registered
    const sessionModel = mongoose.models.Session;
    const attendanceModel = mongoose.models.Attendance;
    const auditLogModel = mongoose.models.AuditLog;
    const attachmentModel = mongoose.models.Attachment;

    expect(sessionModel).toBeDefined();
    expect(attendanceModel).toBeDefined();
    expect(auditLogModel).toBeDefined();
    expect(attachmentModel).toBeDefined();
  });

  test('Models should have required schemas', () => {
    const Session = mongoose.models.Session;
    const Attendance = mongoose.models.Attendance;
    
    if (Session) {
      expect(Session.schema.paths.classId).toBeDefined();
      expect(Session.schema.paths.date).toBeDefined();
      expect(Session.schema.paths.status).toBeDefined();
    }

    if (Attendance) {
      expect(Attendance.schema.paths.sessionId).toBeDefined();
      expect(Attendance.schema.paths.studentId).toBeDefined();
      expect(Attendance.schema.paths.status).toBeDefined();
    }
  });
});
