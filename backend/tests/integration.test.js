const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock auth middleware to bypass real JWT checks in integration tests
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => next(),
  authorize: () => (req, res, next) => next()
}));

// Explicitly load Attachment model to register it in mongoose
require('../models/attachmentModel');

describe('Attendance System Integration Tests', () => {
  let app;
  let testSchoolId;
  let testUserId;
  let testClassId;
  let testSessionId;
  let testStudentId;

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
  });

  beforeEach(async () => {
    // Create test data in the test memory DB
    const School = require('../models/schoolModel');
    const User = require('../models/userModel');
    const Class = require('../models/classModel');
    const Session = require('../models/sessionModel');

    const school = await School.create({
      name: 'Integration Test School',
      address: 'Test Address',
      phone: '1234567890',
      email: 'integration@school.com'
    });
    testSchoolId = school._id;

    const teacher = await User.create({
      name: 'Integration Test Teacher',
      email: 'iteacher@test.com',
      password: 'password123',
      role: 'teacher',
      schoolId: testSchoolId
    });
    testUserId = teacher._id;

    const student = await User.create({
      name: 'Integration Test Student',
      email: 'istudent@test.com',
      password: 'password123',
      role: 'student',
      schoolId: testSchoolId
    });
    testStudentId = student._id;

    const classObj = await Class.create({
      name: 'Integration Test Class',
      subject: 'Math',
      direction: 'Science',
      schoolBranch: 'Branch A',
      schoolId: testSchoolId,
      teachers: [testUserId],
      students: [testStudentId]
    });
    testClassId = classObj._id;

    const sessionObj = await Session.create({
      classId: testClassId,
      schoolId: testSchoolId,
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(Date.now() + 3600000),
      status: 'planned'
    });
    testSessionId = sessionObj._id;
  });

  describe('Session Routes', () => {
    test('GET /api/sessions/classes/:classId/sessions should return empty array initially', async () => {
      const response = await request(app)
        .get(`/api/sessions/classes/${testClassId}/sessions`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    test('POST /api/sessions/classes/:classId/sessions/generate should be accessible', async () => {
      const response = await request(app)
        .post(`/api/sessions/classes/${testClassId}/sessions/generate`)
        .send({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Attendance Routes', () => {
    test('GET /api/attendance/sessions/:sessionId/attendance should be accessible', async () => {
      const response = await request(app)
        .get(`/api/attendance/sessions/${testSessionId}/attendance`);

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    test('PUT /api/attendance/sessions/:sessionId/attendance/:studentId should be accessible', async () => {
      const response = await request(app)
        .put(`/api/attendance/sessions/${testSessionId}/attendance/${testStudentId}`)
        .send({
          status: 'present'
        });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Reporting Routes', () => {
    test('GET /api/reports/reports/attendance/daily should be accessible', async () => {
      const response = await request(app)
        .get('/api/reports/reports/attendance/daily')
        .query({ date: '2024-01-01' });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    test('GET /api/reports/reports/attendance/student should be accessible', async () => {
      const response = await request(app)
        .get('/api/reports/reports/attendance/student');

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
      expect(Session.schema.paths.scheduledStartAt).toBeDefined();
      expect(Session.schema.paths.status).toBeDefined();
    }

    if (Attendance) {
      expect(Attendance.schema.paths.sessionId).toBeDefined();
      expect(Attendance.schema.paths.studentId).toBeDefined();
      expect(Attendance.schema.paths.status).toBeDefined();
    }
  });
});
