const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const AuditLog = require('../models/auditLogModel');
const Session = require('../models/sessionModel');
const Attendance = require('../models/attendanceModel');
const School = require('../models/schoolModel');
const User = require('../models/userModel');
const { auditLogPlugin } = require('../middleware/auditLogMiddleware');

describe('Audit Log Tests', () => {
  let mongoServer;
  let testSchool, testUser, testSession;

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
    await AuditLog.deleteMany({});
    await Session.deleteMany({});
    await Attendance.deleteMany({});
    await School.deleteMany({});
    await User.deleteMany({});

    // Create test school
    testSchool = await School.create({
      name: 'Test School',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@school.com'
    });

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      role: 'admin',
      schoolId: testSchool._id
    });
  });

  describe('Manual Audit Logging', () => {
    test('should create audit log entry manually', async () => {
      const auditData = {
        entity: 'Session',
        entityId: new mongoose.Types.ObjectId(),
        schoolId: testSchool._id,
        actorUserId: testUser._id,
        operation: 'create',
        reasonCode: 'manual_correction',
        reasonText: 'Created test session',
        changes: [
          { field: 'status', before: null, after: 'planned' },
          { field: 'room', before: null, after: 'Room 101' }
        ],
        clientInfo: {
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const auditEntry = await AuditLog.logAction(auditData);

      expect(auditEntry).toBeDefined();
      expect(auditEntry.entity).toBe('Session');
      expect(auditEntry.operation).toBe('create');
      expect(auditEntry.reasonCode).toBe('manual_correction');
      expect(auditEntry.changes).toHaveLength(2);
      expect(auditEntry.clientInfo.ipAddress).toBe('192.168.1.1');
    });

    test('should get audit trail for entity', async () => {
      const entityId = new mongoose.Types.ObjectId();
      
      // Create multiple audit entries
      const auditEntries = [
        {
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'create',
          changes: [{ field: 'status', before: null, after: 'planned' }]
        },
        {
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'update',
          changes: [{ field: 'status', before: 'planned', after: 'held' }]
        },
        {
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'cancel',
          reasonCode: 'admin_override',
          changes: [{ field: 'status', before: 'held', after: 'canceled' }]
        }
      ];

      for (const entry of auditEntries) {
        await AuditLog.logAction(entry);
      }

      const trail = await AuditLog.getEntityAuditTrail('Session', entityId, {
        populate: true
      });

      expect(trail).toHaveLength(3);
      expect(trail[0].operation).toBe('cancel'); // Most recent first
      expect(trail[1].operation).toBe('update');
      expect(trail[2].operation).toBe('create');
      expect(trail[0].actorUserId.name).toBe('Test User'); // Populated
    });

    test('should filter audit trail by operation', async () => {
      const entityId = new mongoose.Types.ObjectId();
      
      await AuditLog.logAction({
        entity: 'Session',
        entityId: entityId,
        schoolId: testSchool._id,
        actorUserId: testUser._id,
        operation: 'create',
        changes: []
      });

      await AuditLog.logAction({
        entity: 'Session',
        entityId: entityId,
        schoolId: testSchool._id,
        actorUserId: testUser._id,
        operation: 'update',
        changes: []
      });

      const updateTrail = await AuditLog.getEntityAuditTrail('Session', entityId, {
        operation: 'update'
      });

      expect(updateTrail).toHaveLength(1);
      expect(updateTrail[0].operation).toBe('update');
    });

    test('should get user activity', async () => {
      const entityId1 = new mongoose.Types.ObjectId();
      const entityId2 = new mongoose.Types.ObjectId();

      await AuditLog.logAction({
        entity: 'Session',
        entityId: entityId1,
        schoolId: testSchool._id,
        actorUserId: testUser._id,
        operation: 'create',
        changes: []
      });

      await AuditLog.logAction({
        entity: 'Attendance',
        entityId: entityId2,
        schoolId: testSchool._id,
        actorUserId: testUser._id,
        operation: 'update',
        changes: []
      });

      const activity = await AuditLog.getUserActivity(testUser._id, {
        populate: true
      });

      expect(activity).toHaveLength(2);
      expect(activity[0].actorUserId.name).toBe('Test User');
    });
  });

  describe('Field Changes Calculation', () => {
    test('should calculate field changes correctly', async () => {
      const beforeDoc = {
        status: 'planned',
        room: null,
        notes: 'Initial notes'
      };

      const afterDoc = {
        status: 'held',
        room: 'Room 101',
        notes: 'Initial notes' // No change
      };

      const changes = AuditLog.createFieldChanges(beforeDoc, afterDoc, [
        'status', 'room', 'notes'
      ]);

      expect(changes).toHaveLength(2); // status and room changed
      
      const statusChange = changes.find(c => c.field === 'status');
      expect(statusChange).toBeDefined();
      expect(statusChange.before).toBe('planned');
      expect(statusChange.after).toBe('held');

      const roomChange = changes.find(c => c.field === 'room');
      expect(roomChange).toBeDefined();
      expect(roomChange.before).toBeNull();
      expect(roomChange.after).toBe('Room 101');

      // Notes should not be in changes as it didn't change
      const notesChange = changes.find(c => c.field === 'notes');
      expect(notesChange).toBeUndefined();
    });

    test('should handle null/undefined values', async () => {
      const beforeDoc = null;
      const afterDoc = {
        status: 'planned',
        room: 'Room 101'
      };

      const changes = AuditLog.createFieldChanges(beforeDoc, afterDoc, [
        'status', 'room'
      ]);

      expect(changes).toHaveLength(2);
      expect(changes[0].before).toBeNull();
      expect(changes[1].before).toBeNull();
    });

    test('should handle date comparisons', async () => {
      const date1 = new Date('2024-01-01T09:00:00Z');
      const date2 = new Date('2024-01-01T10:00:00Z');

      const beforeDoc = { scheduledStartAt: date1 };
      const afterDoc = { scheduledStartAt: date2 };

      const changes = AuditLog.createFieldChanges(beforeDoc, afterDoc, [
        'scheduledStartAt'
      ]);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe('scheduledStartAt');
      expect(changes[0].before).toEqual(date1);
      expect(changes[0].after).toEqual(date2);
    });
  });

  describe('Audit Log Queries and Filtering', () => {
    beforeEach(async () => {
      const entityId = new mongoose.Types.ObjectId();
      
      // Create audit entries with different properties
      const auditEntries = [
        {
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'create',
          reasonCode: 'system_policy',
          occurredAt: new Date('2024-01-01T09:00:00Z')
        },
        {
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'update',
          reasonCode: 'manual_correction',
          occurredAt: new Date('2024-01-02T09:00:00Z')
        },
        {
          entity: 'Attendance',
          entityId: new mongoose.Types.ObjectId(),
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'create',
          reasonCode: 'manual_correction',
          occurredAt: new Date('2024-01-03T09:00:00Z')
        }
      ];

      for (const entry of auditEntries) {
        await AuditLog.logAction(entry);
      }
    });

    test('should filter by date range', async () => {
      const logs = await AuditLog.find({
        occurredAt: {
          $gte: new Date('2024-01-01T00:00:00Z'),
          $lte: new Date('2024-01-02T23:59:59Z')
        }
      });

      expect(logs).toHaveLength(2);
    });

    test('should filter by reason code', async () => {
      const logs = await AuditLog.find({
        reasonCode: 'manual_correction'
      });

      expect(logs).toHaveLength(2);
    });

    test('should filter by entity type', async () => {
      const sessionLogs = await AuditLog.find({
        entity: 'Session'
      });

      expect(sessionLogs).toHaveLength(2);

      const attendanceLogs = await AuditLog.find({
        entity: 'Attendance'
      });

      expect(attendanceLogs).toHaveLength(1);
    });

    test('should sort by occurrence time descending', async () => {
      const logs = await AuditLog.find({}).sort({ occurredAt: -1 });

      expect(logs).toHaveLength(3);
      expect(logs[0].occurredAt.getTime()).toBeGreaterThan(logs[1].occurredAt.getTime());
      expect(logs[1].occurredAt.getTime()).toBeGreaterThan(logs[2].occurredAt.getTime());
    });
  });

  describe('Audit Log Performance', () => {
    test('should handle large number of audit entries efficiently', async () => {
      const startTime = Date.now();
      const entityId = new mongoose.Types.ObjectId();
      
      // Create many audit entries
      const auditEntries = [];
      for (let i = 0; i < 100; i++) {
        auditEntries.push({
          entity: 'Session',
          entityId: entityId,
          schoolId: testSchool._id,
          actorUserId: testUser._id,
          operation: 'update',
          changes: [{ field: 'status', before: 'planned', after: 'held' }],
          occurredAt: new Date(Date.now() + i * 1000) // Stagger times
        });
      }

      // Bulk create
      for (const entry of auditEntries) {
        await AuditLog.logAction(entry);
      }

      const createTime = Date.now() - startTime;
      console.log(`Created 100 audit entries in ${createTime}ms`);

      // Query performance
      const queryStartTime = Date.now();
      const trail = await AuditLog.getEntityAuditTrail('Session', entityId, {
        limit: 10
      });
      const queryTime = Date.now() - queryStartTime;

      console.log(`Queried audit trail in ${queryTime}ms`);

      expect(trail).toHaveLength(10);
      expect(createTime).toBeLessThan(5000); // Should complete in reasonable time
      expect(queryTime).toBeLessThan(100);   // Query should be fast
    });
  });
});
