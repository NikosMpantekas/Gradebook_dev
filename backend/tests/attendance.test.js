const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Attendance = require('../models/attendanceModel');
const Session = require('../models/sessionModel');
const Class = require('../models/classModel');
const School = require('../models/schoolModel');
const User = require('../models/userModel');

describe('Attendance Model Tests', () => {
  let mongoServer;
  let testSchool, testClass, testSession, testStudent, testTeacher;

  beforeAll(async () => {
    // Setup in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean database
    await Attendance.deleteMany({});
    await Session.deleteMany({});
    await Class.deleteMany({});
    await School.deleteMany({});
    await User.deleteMany({});

    // Create test school
    testSchool = await School.create({
      name: 'Test School',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@school.com'
    });

    // Create test teacher
    testTeacher = await User.create({
      name: 'Test Teacher',
      email: 'teacher@test.com',
      password: 'password123',
      role: 'teacher',
      schoolId: testSchool._id
    });

    // Create test student
    testStudent = await User.create({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'student',
      schoolId: testSchool._id
    });

    // Create test class
    testClass = await Class.create({
      name: 'Test Math Class',
      subject: 'Mathematics',
      direction: 'Science',
      schoolBranch: 'Main Branch',
      schoolId: testSchool._id,
      teachers: [testTeacher._id],
      students: [testStudent._id],
      schedule: [
        {
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:30'
        }
      ]
    });

    // Create test session
    testSession = await Session.create({
      classId: testClass._id,
      schoolId: testSchool._id,
      scheduledStartAt: new Date('2024-01-01T09:00:00Z'),
      scheduledEndAt: new Date('2024-01-01T10:30:00Z'),
      status: 'planned'
    });
  });

  describe('Idempotent Attendance Upsert', () => {
    test('should create new attendance record', async () => {
      const attendanceData = {
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        minutesPresent: 90,
        source: 'manual',
        markedBy: testTeacher._id
      };

      const attendance = await Attendance.upsertAttendance(attendanceData);

      expect(attendance).toBeDefined();
      expect(attendance.status).toBe('present');
      expect(attendance.minutesPresent).toBe(90);
      expect(attendance.version).toBe(1);
      expect(attendance.markedBy.toString()).toBe(testTeacher._id.toString());
    });

    test('should update existing attendance record (idempotent)', async () => {
      // Create initial attendance
      const initialData = {
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'absent',
        source: 'manual',
        markedBy: testTeacher._id
      };

      const initial = await Attendance.upsertAttendance(initialData);
      expect(initial.status).toBe('absent');
      expect(initial.version).toBe(1);

      // Update attendance
      const updateData = {
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        minutesPresent: 85,
        note: 'Arrived late but participated',
        source: 'manual',
        markedBy: testTeacher._id
      };

      const updated = await Attendance.upsertAttendance(updateData);

      expect(updated._id.toString()).toBe(initial._id.toString()); // Same record
      expect(updated.status).toBe('present');
      expect(updated.minutesPresent).toBe(85);
      expect(updated.note).toBe('Arrived late but participated');
      expect(updated.version).toBe(2); // Version incremented

      // Verify only one record exists
      const count = await Attendance.countDocuments({
        sessionId: testSession._id,
        studentId: testStudent._id
      });
      expect(count).toBe(1);
    });

    test('should fail when session is canceled', async () => {
      // Cancel the session
      await testSession.cancel('Test cancellation', testTeacher._id);

      const attendanceData = {
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        source: 'manual',
        markedBy: testTeacher._id
      };

      await expect(Attendance.upsertAttendance(attendanceData)).rejects.toThrow('Cannot mark attendance on canceled session');
    });

    test('should mark session as held when first attendance is recorded', async () => {
      expect(testSession.status).toBe('planned');

      await Attendance.upsertAttendance({
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        source: 'manual',
        markedBy: testTeacher._id
      });

      // Reload session to check status
      await testSession.reload();
      expect(testSession.status).toBe('held');
      expect(testSession.actualStartAt).toBeDefined();
    });
  });

  describe('Attendance Compound Index', () => {
    test('should enforce unique constraint on sessionId + studentId', async () => {
      const attendanceData = {
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        markedBy: testTeacher._id,
        schoolId: testSchool._id,
        classId: testClass._id
      };

      // Create first attendance
      await Attendance.create(attendanceData);

      // Try to create duplicate directly (bypassing upsert) - should fail
      await expect(Attendance.create(attendanceData)).rejects.toThrow();
    });
  });

  describe('Late Policy Application', () => {
    test('should apply late policy correctly', async () => {
      const attendance = new Attendance({
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'late',
        lateMinutes: 20,
        markedBy: testTeacher._id,
        schoolId: testSchool._id,
        classId: testClass._id
      });

      // Apply 15-minute threshold
      const policyApplied = attendance.applyLatePolicy(15);

      expect(policyApplied).toBe(true);
      expect(attendance.status).toBe('absent');
      expect(attendance.note).toContain('Auto-marked absent: late by 20 minutes');
    });

    test('should not apply late policy if within threshold', async () => {
      const attendance = new Attendance({
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'late',
        lateMinutes: 10,
        markedBy: testTeacher._id,
        schoolId: testSchool._id,
        classId: testClass._id
      });

      // Apply 15-minute threshold
      const policyApplied = attendance.applyLatePolicy(15);

      expect(policyApplied).toBe(false);
      expect(attendance.status).toBe('late');
    });
  });

  describe('Attendance Validation', () => {
    test('should clear inappropriate fields based on status', async () => {
      const attendance = new Attendance({
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'absent',
        minutesPresent: 50, // Should be cleared
        lateMinutes: 10,    // Should be cleared
        markedBy: testTeacher._id,
        schoolId: testSchool._id,
        classId: testClass._id
      });

      await attendance.save();

      expect(attendance.minutesPresent).toBeNull();
      expect(attendance.lateMinutes).toBeNull();
    });

    test('should clear late minutes for non-late status', async () => {
      const attendance = new Attendance({
        sessionId: testSession._id,
        studentId: testStudent._id,
        status: 'present',
        minutesPresent: 90,
        lateMinutes: 5, // Should be cleared
        markedBy: testTeacher._id,
        schoolId: testSchool._id,
        classId: testClass._id
      });

      await attendance.save();

      expect(attendance.minutesPresent).toBe(90);
      expect(attendance.lateMinutes).toBeNull();
    });
  });

  describe('Attendance Queries', () => {
    beforeEach(async () => {
      // Create multiple attendance records
      const attendanceRecords = [
        {
          sessionId: testSession._id,
          studentId: testStudent._id,
          status: 'present',
          minutesPresent: 90,
          markedBy: testTeacher._id,
          schoolId: testSchool._id,
          classId: testClass._id
        }
      ];

      // Create another student and session for variety
      const student2 = await User.create({
        name: 'Student 2',
        email: 'student2@test.com',
        password: 'password123',
        role: 'student',
        schoolId: testSchool._id
      });

      const session2 = await Session.create({
        classId: testClass._id,
        schoolId: testSchool._id,
        scheduledStartAt: new Date('2024-01-02T09:00:00Z'),
        scheduledEndAt: new Date('2024-01-02T10:30:00Z'),
        status: 'held'
      });

      attendanceRecords.push(
        {
          sessionId: session2._id,
          studentId: testStudent._id,
          status: 'late',
          lateMinutes: 10,
          minutesPresent: 80,
          markedBy: testTeacher._id,
          schoolId: testSchool._id,
          classId: testClass._id
        },
        {
          sessionId: testSession._id,
          studentId: student2._id,
          status: 'absent',
          markedBy: testTeacher._id,
          schoolId: testSchool._id,
          classId: testClass._id
        }
      );

      await Attendance.insertMany(attendanceRecords);
    });

    test('should get session attendance', async () => {
      const attendance = await Attendance.getSessionAttendance(testSession._id, {
        populate: true,
        includeMarkedBy: true
      });

      expect(attendance).toHaveLength(2); // testStudent and student2
      expect(attendance[0].studentId).toBeDefined();
      expect(attendance[0].markedBy).toBeDefined();
    });

    test('should get student attendance history', async () => {
      const attendance = await Attendance.getStudentAttendance(
        testStudent._id,
        '2024-01-01',
        '2024-01-31',
        { populate: true }
      );

      expect(attendance).toHaveLength(2); // Two sessions for testStudent
      expect(attendance[0].session).toBeDefined();
      expect(attendance[0].class).toBeDefined();
    });

    test('should filter attendance by status', async () => {
      const presentAttendance = await Attendance.find({
        classId: testClass._id,
        status: 'present'
      });
      expect(presentAttendance).toHaveLength(1);

      const absentAttendance = await Attendance.find({
        classId: testClass._id,
        status: 'absent'
      });
      expect(absentAttendance).toHaveLength(1);
    });
  });

  describe('Attendance Statistics', () => {
    beforeEach(async () => {
      // Create multiple sessions and attendance records
      const sessions = [];
      const attendanceRecords = [];

      for (let i = 0; i < 5; i++) {
        const session = await Session.create({
          classId: testClass._id,
          schoolId: testSchool._id,
          scheduledStartAt: new Date(`2024-01-0${i + 1}T09:00:00Z`),
          scheduledEndAt: new Date(`2024-01-0${i + 1}T10:30:00Z`),
          status: 'held'
        });
        sessions.push(session);

        // Student present in first 3 sessions, absent in last 2
        attendanceRecords.push({
          sessionId: session._id,
          studentId: testStudent._id,
          status: i < 3 ? 'present' : 'absent',
          minutesPresent: i < 3 ? 90 : null,
          markedBy: testTeacher._id,
          schoolId: testSchool._id,
          classId: testClass._id
        });
      }

      await Attendance.insertMany(attendanceRecords);
    });

    test('should calculate correct attendance statistics', async () => {
      const attendance = await Attendance.find({
        studentId: testStudent._id,
        classId: testClass._id
      });

      expect(attendance).toHaveLength(5);

      const present = attendance.filter(a => a.status === 'present').length;
      const absent = attendance.filter(a => a.status === 'absent').length;

      expect(present).toBe(3);
      expect(absent).toBe(2);

      const attendanceRate = (present / attendance.length * 100);
      expect(attendanceRate).toBe(60);
    });
  });
});
