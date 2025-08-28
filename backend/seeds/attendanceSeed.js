const mongoose = require('mongoose');
const Class = require('../models/classModel');
const Session = require('../models/sessionModel');
const Attendance = require('../models/attendanceModel');
const User = require('../models/userModel');
const School = require('../models/schoolModel');
const AuditLog = require('../models/auditLogModel');

/**
 * Comprehensive seed script for attendance system demonstration
 * Creates realistic test data with full audit trail
 */
async function seedAttendanceData() {
  try {
    console.log('🌱 Starting attendance system seed...');

    // Check if data already exists
    const existingClasses = await Class.countDocuments();
    if (existingClasses > 0) {
      console.log('⚠️  Data already exists. Skipping seed...');
      return;
    }

    // Create test school
    console.log('📚 Creating test school...');
    const testSchool = await School.create({
      name: 'Athens Technical Institute',
      address: '123 Education Street, Athens, Greece',
      phone: '+30 210 1234567',
      email: 'info@athens-tech.edu.gr'
    });

    // Create users
    console.log('👥 Creating users...');
    const adminUser = await User.create({
      name: 'Maria Papadopoulos',
      email: 'admin@athens-tech.edu.gr',
      password: '$2a$10$hashedpassword', // In real app, properly hash
      role: 'admin',
      schoolId: testSchool._id
    });

    const teachers = await User.insertMany([
      {
        name: 'Nikos Konstantinos',
        email: 'nikos.konstantinos@athens-tech.edu.gr',
        password: '$2a$10$hashedpassword',
        role: 'teacher',
        schoolId: testSchool._id
      },
      {
        name: 'Sofia Dimitriou',
        email: 'sofia.dimitriou@athens-tech.edu.gr',
        password: '$2a$10$hashedpassword',
        role: 'teacher',
        schoolId: testSchool._id
      }
    ]);

    const students = await User.insertMany([
      { name: 'Alexandros Georgiou', email: 'alex.g@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Katerina Vasileiou', email: 'kate.v@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Dimitris Nikolaou', email: 'dim.n@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Elena Christou', email: 'elena.c@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Yannis Stavros', email: 'yannis.s@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Anna Kostas', email: 'anna.k@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Petros Ioannou', email: 'petros.i@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Maria Antoniou', email: 'maria.a@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Christos Panagiotou', email: 'christos.p@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id },
      { name: 'Sophia Michaelidou', email: 'sophia.m@student.gr', password: '$2a$10$hashedpassword', role: 'student', schoolId: testSchool._id }
    ]);

    console.log(`✅ Created ${teachers.length} teachers and ${students.length} students`);

    // Create classes with realistic schedules
    console.log('🏫 Creating classes...');
    const classes = await Class.insertMany([
      {
        name: 'Advanced Mathematics A1',
        subject: 'Mathematics',
        direction: 'Science & Technology',
        schoolBranch: 'Main Campus',
        schoolId: testSchool._id,
        teachers: [teachers[0]._id],
        students: students.slice(0, 5).map(s => s._id),
        schedule: [
          { day: 'Monday', startTime: '09:00', endTime: '10:30' },
          { day: 'Wednesday', startTime: '11:00', endTime: '12:30' },
          { day: 'Friday', startTime: '14:00', endTime: '15:30' }
        ]
      },
      {
        name: 'Physics Laboratory B2',
        subject: 'Physics',
        direction: 'Applied Sciences',
        schoolBranch: 'Lab Building',
        schoolId: testSchool._id,
        teachers: [teachers[1]._id],
        students: students.slice(3, 8).map(s => s._id),
        schedule: [
          { day: 'Tuesday', startTime: '10:00', endTime: '12:00' },
          { day: 'Thursday', startTime: '13:00', endTime: '15:00' }
        ]
      },
      {
        name: 'Computer Programming C1',
        subject: 'Computer Science',
        direction: 'Information Technology',
        schoolBranch: 'IT Center',
        schoolId: testSchool._id,
        teachers: [teachers[0]._id, teachers[1]._id],
        students: students.slice(5, 10).map(s => s._id),
        schedule: [
          { day: 'Monday', startTime: '15:30', endTime: '17:00' },
          { day: 'Wednesday', startTime: '09:30', endTime: '11:00' },
          { day: 'Friday', startTime: '10:30', endTime: '12:00' }
        ]
      }
    ]);

    console.log(`✅ Created ${classes.length} classes`);

    // Generate sessions for the past month and next month
    console.log('📅 Generating sessions...');
    const today = new Date();
    const pastMonth = new Date(today);
    pastMonth.setMonth(pastMonth.getMonth() - 1);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    let totalSessionsGenerated = 0;
    for (const classData of classes) {
      const result = await Session.generateSessionsForClass(
        classData._id,
        pastMonth.toISOString().split('T')[0],
        nextMonth.toISOString().split('T')[0]
      );
      totalSessionsGenerated += result.upsertedCount;
      
      // Create some audit logs for session generation
      await AuditLog.logAction({
        entity: 'Session',
        entityId: classData._id,
        schoolId: testSchool._id,
        actorUserId: adminUser._id,
        operation: 'create',
        reasonCode: 'system_policy',
        reasonText: `Generated ${result.upsertedCount} sessions for ${classData.name}`,
        changes: [],
        metadata: new Map([
          ['sessionCount', result.upsertedCount],
          ['dateRange', `${pastMonth.toDateString()} to ${nextMonth.toDateString()}`]
        ])
      });
    }

    console.log(`✅ Generated ${totalSessionsGenerated} sessions`);

    // Create realistic attendance data for past sessions
    console.log('✅ Creating attendance records...');
    const pastSessions = await Session.find({
      schoolId: testSchool._id,
      scheduledStartAt: { $lt: today },
      status: 'planned'
    }).populate('classId');

    let attendanceRecordsCreated = 0;
    const attendanceStatuses = ['present', 'absent', 'late', 'excused', 'remote'];
    const statusWeights = [0.7, 0.15, 0.08, 0.04, 0.03]; // Realistic distribution

    for (const session of pastSessions) {
      // Mark session as held
      await session.markAsHeld(session.scheduledStartAt);
      
      const classStudents = session.classId.students;
      
      for (const studentId of classStudents) {
        // Weighted random status selection
        const random = Math.random();
        let cumulativeWeight = 0;
        let selectedStatus = 'present';
        
        for (let i = 0; i < statusWeights.length; i++) {
          cumulativeWeight += statusWeights[i];
          if (random <= cumulativeWeight) {
            selectedStatus = attendanceStatuses[i];
            break;
          }
        }

        // Create realistic data based on status
        const attendanceData = {
          sessionId: session._id,
          studentId: studentId,
          status: selectedStatus,
          source: Math.random() > 0.1 ? 'manual' : 'qr', // 90% manual, 10% QR
          markedBy: session.classId.teachers[Math.floor(Math.random() * session.classId.teachers.length)]
        };

        // Add realistic time data
        if (selectedStatus === 'present') {
          attendanceData.minutesPresent = Math.floor(Math.random() * 20) + 70; // 70-90 minutes
        } else if (selectedStatus === 'late') {
          attendanceData.lateMinutes = Math.floor(Math.random() * 25) + 5; // 5-30 minutes late
          attendanceData.minutesPresent = Math.max(0, 90 - attendanceData.lateMinutes - Math.floor(Math.random() * 10));
        } else if (selectedStatus === 'remote') {
          attendanceData.minutesPresent = Math.floor(Math.random() * 15) + 80; // 80-95 minutes (more focused online)
          attendanceData.note = 'Attended via video conference';
        } else if (selectedStatus === 'excused') {
          attendanceData.note = getRandomExcuse();
        }

        try {
          await Attendance.upsertAttendance(attendanceData);
          attendanceRecordsCreated++;
        } catch (error) {
          console.warn(`Warning: Could not create attendance for student ${studentId}:`, error.message);
        }
      }

      // Add some corrections (admin overrides) for realism
      if (Math.random() < 0.05) { // 5% of sessions have corrections
        const randomStudent = classStudents[Math.floor(Math.random() * classStudents.length)];
        
        // Simulate admin correction
        const correctionData = {
          sessionId: session._id,
          studentId: randomStudent,
          status: 'excused',
          note: 'Administrative correction - medical excuse provided',
          source: 'manual',
          markedBy: adminUser._id,
          reasonCode: 'admin_override',
          reasonText: 'Student provided medical documentation after session'
        };

        try {
          await Attendance.upsertAttendance(correctionData);
          
          // Create audit log for admin correction
          await AuditLog.logAction({
            entity: 'Attendance',
            entityId: session._id, // Using session as reference
            schoolId: testSchool._id,
            actorUserId: adminUser._id,
            operation: 'update',
            reasonCode: 'admin_override',
            reasonText: 'Admin correction with medical excuse',
            changes: [
              { field: 'status', before: 'absent', after: 'excused' },
              { field: 'note', before: '', after: correctionData.note }
            ],
            clientInfo: {
              ipAddress: '192.168.1.100',
              userAgent: 'Admin Dashboard v1.0'
            }
          });
        } catch (error) {
          console.warn('Warning: Could not create admin correction:', error.message);
        }
      }
    }

    console.log(`✅ Created ${attendanceRecordsCreated} attendance records`);

    // Create some postponed and canceled sessions for demonstration
    console.log('🔄 Creating postponed and canceled sessions...');
    const futureSessions = await Session.find({
      schoolId: testSchool._id,
      scheduledStartAt: { $gt: today },
      status: 'planned'
    }).limit(5);

    if (futureSessions.length >= 2) {
      // Postpone one session
      const sessionToPostpone = futureSessions[0];
      const newDate = new Date(sessionToPostpone.scheduledStartAt);
      newDate.setDate(newDate.getDate() + 7); // Move one week later
      
      const newEndDate = new Date(sessionToPostpone.scheduledEndAt);
      newEndDate.setDate(newEndDate.getDate() + 7);

      await sessionToPostpone.postpone(
        newDate,
        newEndDate,
        'Teacher training workshop conflict',
        teachers[0]._id
      );

      // Cancel one session
      const sessionToCancel = futureSessions[1];
      await sessionToCancel.cancel(
        'Equipment maintenance in laboratory',
        adminUser._id
      );

      console.log('✅ Created sample postponed and canceled sessions');
    }

    // Generate summary statistics
    console.log('📊 Generating summary statistics...');
    const totalSessions = await Session.countDocuments({ schoolId: testSchool._id });
    const heldSessions = await Session.countDocuments({ schoolId: testSchool._id, status: 'held' });
    const totalAttendance = await Attendance.countDocuments({ schoolId: testSchool._id });
    const presentCount = await Attendance.countDocuments({ schoolId: testSchool._id, status: 'present' });
    const overallAttendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance * 100).toFixed(1) : 0;

    console.log('\n🎉 Attendance system seed completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📚 School: ${testSchool.name}`);
    console.log(`👥 Users: ${teachers.length} teachers, ${students.length} students, 1 admin`);
    console.log(`🏫 Classes: ${classes.length} classes with realistic schedules`);
    console.log(`📅 Sessions: ${totalSessions} total (${heldSessions} held, ${totalSessions - heldSessions} future/canceled/postponed)`);
    console.log(`✅ Attendance: ${totalAttendance} records with ${overallAttendanceRate}% overall presence rate`);
    console.log(`📝 Audit logs: Created with realistic corrections and admin overrides`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Ready to test attendance system features:');
    console.log('   • Session generation and management');
    console.log('   • Idempotent attendance marking');
    console.log('   • Admin corrections with audit trail');
    console.log('   • Reporting and CSV exports');
    console.log('   • Late policy application');
    console.log('   • Session postponing and cancellation');

  } catch (error) {
    console.error('❌ Error seeding attendance data:', error);
    throw error;
  }
}

/**
 * Helper function to generate realistic excuse notes
 */
function getRandomExcuse() {
  const excuses = [
    'Medical appointment with doctor note',
    'Family emergency - documented',
    'Illness - parent notification received',
    'Religious holiday observance',
    'School-approved field trip',
    'Pre-approved family travel',
    'Medical procedure - hospital documentation',
    'Bereavement leave - family notification',
    'Transportation strike - city-wide',
    'Weather emergency - school transport cancelled'
  ];
  
  return excuses[Math.floor(Math.random() * excuses.length)];
}

module.exports = { seedAttendanceData };

// Run seed if called directly
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB().then(async () => {
    try {
      await seedAttendanceData();
      console.log('\n✨ Seed completed! You can now test the attendance system.');
    } catch (error) {
      console.error('Seed failed:', error);
    } finally {
      mongoose.connection.close();
    }
  });
}
