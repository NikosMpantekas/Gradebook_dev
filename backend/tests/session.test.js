const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Session = require('../models/sessionModel');
const Class = require('../models/classModel');
const School = require('../models/schoolModel');
const User = require('../models/userModel');

describe('Session Model Tests', () => {
  let mongoServer;
  let testSchool, testClass, testTeacher;

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

    // Create test class with schedule
    testClass = await Class.create({
      name: 'Test Math Class',
      subject: 'Mathematics',
      direction: 'Science',
      schoolBranch: 'Main Branch',
      schoolId: testSchool._id,
      teachers: [testTeacher._id],
      students: [],
      schedule: [
        {
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:30'
        },
        {
          day: 'Wednesday',
          startTime: '14:00',
          endTime: '15:30'
        }
      ]
    });
  });

  describe('Session Generation', () => {
    test('should generate sessions for class schedule without duplicates', async () => {
      const startDate = new Date('2024-01-01'); // Monday
      const endDate = new Date('2024-01-07');   // Sunday

      // Generate sessions
      const result = await Session.generateSessionsForClass(
        testClass._id,
        startDate,
        endDate
      );

      expect(result.upsertedCount).toBe(2); // Monday and Wednesday
      expect(result.modifiedCount).toBe(0);

      // Verify sessions were created
      const sessions = await Session.find({ classId: testClass._id });
      expect(sessions).toHaveLength(2);

      // Check Monday session
      const mondaySession = sessions.find(s => 
        s.scheduledStartAt.getDay() === 1 && 
        s.scheduledStartAt.getHours() === 9
      );
      expect(mondaySession).toBeDefined();
      expect(mondaySession.status).toBe('planned');
      expect(mondaySession.schoolId.toString()).toBe(testSchool._id.toString());

      // Check Wednesday session
      const wednesdaySession = sessions.find(s => 
        s.scheduledStartAt.getDay() === 3 && 
        s.scheduledStartAt.getHours() === 14
      );
      expect(wednesdaySession).toBeDefined();
    });

    test('should not create duplicate sessions on subsequent generation', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // First generation
      await Session.generateSessionsForClass(testClass._id, startDate, endDate);
      
      // Second generation (should not create duplicates)
      const result = await Session.generateSessionsForClass(testClass._id, startDate, endDate);
      
      expect(result.upsertedCount).toBe(0);
      expect(result.modifiedCount).toBe(0);

      // Verify still only 2 sessions
      const sessions = await Session.find({ classId: testClass._id });
      expect(sessions).toHaveLength(2);
    });

    test('should handle class with no schedule', async () => {
      // Create class without schedule
      const emptyClass = await Class.create({
        name: 'Empty Schedule Class',
        subject: 'Test',
        direction: 'Test',
        schoolBranch: 'Test',
        schoolId: testSchool._id,
        schedule: []
      });

      const result = await Session.generateSessionsForClass(
        emptyClass._id,
        new Date('2024-01-01'),
        new Date('2024-01-07')
      );

      expect(result.upsertedCount).toBe(0);
    });
  });

  describe('Session Status Management', () => {
    let testSession;

    beforeEach(async () => {
      testSession = await Session.create({
        classId: testClass._id,
        schoolId: testSchool._id,
        scheduledStartAt: new Date('2024-01-01T09:00:00Z'),
        scheduledEndAt: new Date('2024-01-01T10:30:00Z'),
        status: 'planned'
      });
    });

    test('should postpone session correctly', async () => {
      const newStartAt = new Date('2024-01-08T09:00:00Z');
      const newEndAt = new Date('2024-01-08T10:30:00Z');
      const reason = 'Teacher illness';

      const newSession = await testSession.postpone(
        newStartAt,
        newEndAt,
        reason,
        testTeacher._id
      );

      // Check original session is postponed
      await testSession.reload();
      expect(testSession.status).toBe('postponed');
      expect(testSession.metadata.get('postponeReason')).toBe(reason);

      // Check new session is created
      expect(newSession).toBeDefined();
      expect(newSession.status).toBe('planned');
      expect(newSession.scheduledStartAt).toEqual(newStartAt);
      expect(newSession.originalSessionId.toString()).toBe(testSession._id.toString());
    });

    test('should cancel session correctly', async () => {
      const reason = 'School closure';

      await testSession.cancel(reason, testTeacher._id);

      expect(testSession.status).toBe('canceled');
      expect(testSession.metadata.get('cancelReason')).toBe(reason);
      expect(testSession.metadata.get('canceledBy').toString()).toBe(testTeacher._id.toString());
    });

    test('should mark session as held', async () => {
      const actualStartTime = new Date('2024-01-01T09:05:00Z');

      await testSession.markAsHeld(actualStartTime);

      expect(testSession.status).toBe('held');
      expect(testSession.actualStartAt).toEqual(actualStartTime);
    });
  });

  describe('Session Compound Index', () => {
    test('should enforce unique constraint on classId + scheduledStartAt', async () => {
      const sessionData = {
        classId: testClass._id,
        schoolId: testSchool._id,
        scheduledStartAt: new Date('2024-01-01T09:00:00Z'),
        scheduledEndAt: new Date('2024-01-01T10:30:00Z'),
        status: 'planned'
      };

      // Create first session
      await Session.create(sessionData);

      // Try to create duplicate - should fail
      await expect(Session.create(sessionData)).rejects.toThrow();
    });
  });

  describe('Session Queries', () => {
    beforeEach(async () => {
      // Create multiple sessions
      const sessions = [
        {
          classId: testClass._id,
          schoolId: testSchool._id,
          scheduledStartAt: new Date('2024-01-01T09:00:00Z'),
          scheduledEndAt: new Date('2024-01-01T10:30:00Z'),
          status: 'planned'
        },
        {
          classId: testClass._id,
          schoolId: testSchool._id,
          scheduledStartAt: new Date('2024-01-02T09:00:00Z'),
          scheduledEndAt: new Date('2024-01-02T10:30:00Z'),
          status: 'held'
        },
        {
          classId: testClass._id,
          schoolId: testSchool._id,
          scheduledStartAt: new Date('2024-01-03T09:00:00Z'),
          scheduledEndAt: new Date('2024-01-03T10:30:00Z'),
          status: 'canceled'
        }
      ];

      await Session.insertMany(sessions);
    });

    test('should filter sessions by status', async () => {
      const plannedSessions = await Session.find({ 
        classId: testClass._id, 
        status: 'planned' 
      });
      expect(plannedSessions).toHaveLength(1);

      const heldSessions = await Session.find({ 
        classId: testClass._id, 
        status: 'held' 
      });
      expect(heldSessions).toHaveLength(1);
    });

    test('should filter sessions by date range', async () => {
      const sessions = await Session.find({
        classId: testClass._id,
        scheduledStartAt: {
          $gte: new Date('2024-01-01T00:00:00Z'),
          $lte: new Date('2024-01-02T23:59:59Z')
        }
      });
      expect(sessions).toHaveLength(2);
    });
  });
});
