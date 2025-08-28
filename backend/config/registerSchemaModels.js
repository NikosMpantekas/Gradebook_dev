const mongoose = require('mongoose');

// This utility registers all required schemas in a school-specific database connection
const registerSchemaModels = (connection) => {
  if (!connection) {
    console.error('Invalid connection provided to registerSchemaModels');
    return;
  }

  console.log('Registering schema models for school database connection...');
  
  try {
    // Step 1: Create the schemas first, then register the models in the correct order
    // to avoid reference issues
    
    // Create School schema
    const schoolSchema = new mongoose.Schema({
      name: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      website: { type: String },
      logo: { type: String },
      dbConfig: {
        uri: { type: String, default: '' },
        dbName: { type: String, default: '' }
      }
    }, {
      timestamps: true
    });
    
    // Create Direction schema
    const directionSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String },
      school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }
    }, {
      timestamps: true
    });
    
    // Create Subject schema
    const subjectSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String },
      school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
      direction: { type: mongoose.Schema.Types.ObjectId, ref: 'Direction' },
      color: { type: String, default: '#3f51b5' }
    }, {
      timestamps: true
    });
    
    // Create Notification schema
    const notificationSchema = new mongoose.Schema({
      title: { type: String, required: true },
      message: { type: String, required: true },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      schools: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }],
      directions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Direction' }],
      subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
      sendToAll: { type: Boolean, default: false },
      school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
      direction: { type: mongoose.Schema.Types.ObjectId, ref: 'Direction' },
      subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
      read: { type: Boolean, default: false },
      important: { type: Boolean, default: false }
    }, {
      timestamps: true
    });

    // Create PushSubscription schema
    const pushSubscriptionSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
      schoolId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'School', index: true },
      endpoint: { type: String, required: true, unique: true, index: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      },
      expirationTime: { type: Date, default: null },
      userAgent: { type: String, default: '' },
      platform: {
        isIOS: { type: Boolean, default: false },
        isAndroid: { type: Boolean, default: false },
        isWindows: { type: Boolean, default: false },
        isSafari: { type: Boolean, default: false },
        isChrome: { type: Boolean, default: false },
        isFirefox: { type: Boolean, default: false },
        isPWA: { type: Boolean, default: false },
        browserName: { type: String, default: '' },
        osName: { type: String, default: '' }
      },
      isActive: { type: Boolean, default: true, index: true },
      preferences: {
        grades: { type: Boolean, default: true },
        assignments: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        urgent: { type: Boolean, default: true }
      },
      stats: {
        totalPushes: { type: Number, default: 0 },
        successfulPushes: { type: Number, default: 0 },
        failedPushes: { type: Number, default: 0 },
        lastPushSent: { type: Date, default: null },
        lastPushSuccess: { type: Date, default: null },
        lastError: {
          message: String,
          timestamp: Date,
          statusCode: Number
        }
      },
      createdAt: { type: Date, default: Date.now, index: true },
      lastUpdated: { type: Date, default: Date.now },
      lastUsed: { type: Date, default: Date.now }
    }, {
      timestamps: true
    });
    
    // Step 2: Register models in correct dependency order
    
    // 1. Register School model (no dependencies)
    if (!connection.models['School']) {
      connection.model('School', schoolSchema);
      console.log('✅ School model registered');
    }
    
    // 2. Register Direction model (depends on School)
    if (!connection.models['Direction']) {
      connection.model('Direction', directionSchema);
      console.log('✅ Direction model registered');
    }
    
    // 3. Register Subject model (depends on School and Direction)
    if (!connection.models['Subject']) {
      connection.model('Subject', subjectSchema);
      console.log('✅ Subject model registered');
    }
    
    // 4. Register Notification model (depends on User, School, Direction, Subject)
    if (!connection.models['Notification']) {
      connection.model('Notification', notificationSchema);
      console.log('✅ Notification model registered');
    }

    // 5. Register PushSubscription model (depends on User, School)
    if (!connection.models['PushSubscription']) {
      connection.model('PushSubscription', pushSubscriptionSchema);
      console.log('✅ PushSubscription model registered');
    }

    // 6. Register attendance system models
    // Import and register Session model
    try {
      const sessionModel = require('../models/sessionModel');
      if (!connection.models['Session']) {
        console.log('✅ Session model registered');
      }
    } catch (error) {
      console.log('⚠️  Session model registration skipped:', error.message);
    }

    // Import and register Attendance model
    try {
      const attendanceModel = require('../models/attendanceModel');
      if (!connection.models['Attendance']) {
        console.log('✅ Attendance model registered');
      }
    } catch (error) {
      console.log('⚠️  Attendance model registration skipped:', error.message);
    }

    // Import and register AuditLog model
    try {
      const auditLogModel = require('../models/auditLogModel');
      if (!connection.models['AuditLog']) {
        console.log('✅ AuditLog model registered');
      }
    } catch (error) {
      console.log('⚠️  AuditLog model registration skipped:', error.message);
    }

    // Import and register Attachment model
    try {
      const attachmentModel = require('../models/attachmentModel');
      if (!connection.models['Attachment']) {
        console.log('✅ Attachment model registered');
      }
    } catch (error) {
      console.log('⚠️  Attachment model registration skipped:', error.message);
    }
    
    console.log('Schema models registration complete ✅');
  } catch (error) {
    console.error('Error registering schema models:', error);
  }
};

module.exports = registerSchemaModels;
