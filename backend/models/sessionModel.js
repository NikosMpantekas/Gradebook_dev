const mongoose = require('mongoose');

const sessionSchema = mongoose.Schema(
  {
    // Class association (required for school multi-tenancy)
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    // School association for multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    // Scheduled timing (from class schedule)
    scheduledStartAt: {
      type: Date,
      required: true,
    },
    scheduledEndAt: {
      type: Date,
      required: true,
    },
    // Session lifecycle status
    status: {
      type: String,
      enum: ['planned', 'held', 'canceled', 'postponed'],
      default: 'planned',
      index: true,
    },
    // Actual timing (when session was held)
    actualStartAt: {
      type: Date,
      default: null,
    },
    actualEndAt: {
      type: Date,
      default: null,
    },
    // Session details
    room: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    // Teacher override (if different from class teachers)
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Additional metadata (for postponed sessions, etc.)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
    // Original session reference (for postponed sessions)
    originalSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    // Active status for soft deletion
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for idempotency (no duplicate sessions for same class/time)
sessionSchema.index(
  { classId: 1, scheduledStartAt: 1 }, 
  { unique: true, name: 'session_class_time_unique' }
);

// Performance indexes
sessionSchema.index({ schoolId: 1, status: 1 });
sessionSchema.index({ classId: 1, status: 1 });
sessionSchema.index({ scheduledStartAt: 1, scheduledEndAt: 1 });
sessionSchema.index({ teacherId: 1 }, { sparse: true });

// Static method to generate sessions from class schedule
sessionSchema.statics.generateSessionsForClass = async function(classId, startDate, endDate) {
  try {
    console.log(`[SESSION_GENERATOR] Generating sessions for class ${classId} from ${startDate} to ${endDate}`);
    
    const Class = mongoose.model('Class');
    const classData = await Class.findById(classId).populate('schoolId');
    
    if (!classData) {
      throw new Error('Class not found');
    }

    if (!classData.schedule || classData.schedule.length === 0) {
      console.log(`[SESSION_GENERATOR] No schedule found for class ${classId}`);
      return [];
    }

    const sessions = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Iterate through each day in the date range
    for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Check if class has schedule for this day
      const scheduleForDay = classData.schedule.find(s => s.day === dayName);
      
      if (scheduleForDay) {
        const [startHour, startMinute] = scheduleForDay.startTime.split(':').map(Number);
        const [endHour, endMinute] = scheduleForDay.endTime.split(':').map(Number);
        
        const scheduledStart = new Date(currentDate);
        scheduledStart.setHours(startHour, startMinute, 0, 0);
        
        const scheduledEnd = new Date(currentDate);
        scheduledEnd.setHours(endHour, endMinute, 0, 0);
        
        sessions.push({
          classId: classData._id,
          schoolId: classData.schoolId._id,
          scheduledStartAt: scheduledStart,
          scheduledEndAt: scheduledEnd,
          status: 'planned',
        });
      }
    }

    console.log(`[SESSION_GENERATOR] Generated ${sessions.length} potential sessions`);

    // Bulk insert with upsert to avoid duplicates
    const bulkOps = sessions.map(session => ({
      updateOne: {
        filter: { 
          classId: session.classId, 
          scheduledStartAt: session.scheduledStartAt 
        },
        update: { $setOnInsert: session },
        upsert: true,
      }
    }));

    if (bulkOps.length > 0) {
      const result = await this.bulkWrite(bulkOps, { ordered: false });
      console.log(`[SESSION_GENERATOR] Inserted ${result.upsertedCount} new sessions, ${result.modifiedCount} modified`);
      return result;
    }

    return { upsertedCount: 0, modifiedCount: 0 };
  } catch (error) {
    console.error('[SESSION_GENERATOR] Error generating sessions:', error);
    throw error;
  }
};

// Instance method to postpone session
sessionSchema.methods.postpone = async function(newScheduledStartAt, newScheduledEndAt, reason, actorUserId) {
  try {
    console.log(`[SESSION] Postponing session ${this._id}`);
    
    // Mark current session as postponed
    this.status = 'postponed';
    this.metadata.set('postponeReason', reason);
    this.metadata.set('postponedAt', new Date());
    this.metadata.set('postponedBy', actorUserId);
    await this.save();

    // Create new session
    const Session = this.constructor;
    const newSession = new Session({
      classId: this.classId,
      schoolId: this.schoolId,
      scheduledStartAt: newScheduledStartAt,
      scheduledEndAt: newScheduledEndAt,
      status: 'planned',
      room: this.room,
      notes: this.notes,
      teacherId: this.teacherId,
      originalSessionId: this._id,
    });

    await newSession.save();
    console.log(`[SESSION] Created new postponed session ${newSession._id}`);
    return newSession;
  } catch (error) {
    console.error('[SESSION] Error postponing session:', error);
    throw error;
  }
};

// Instance method to cancel session
sessionSchema.methods.cancel = async function(reason, actorUserId) {
  try {
    console.log(`[SESSION] Canceling session ${this._id}`);
    
    this.status = 'canceled';
    this.metadata.set('cancelReason', reason);
    this.metadata.set('canceledAt', new Date());
    this.metadata.set('canceledBy', actorUserId);
    
    await this.save();
    return this;
  } catch (error) {
    console.error('[SESSION] Error canceling session:', error);
    throw error;
  }
};

// Instance method to start session (first attendance marks it as held)
sessionSchema.methods.markAsHeld = async function(actualStartTime = null) {
  try {
    if (this.status === 'planned') {
      this.status = 'held';
      this.actualStartAt = actualStartTime || new Date();
      await this.save();
      console.log(`[SESSION] Session ${this._id} marked as held`);
    }
    return this;
  } catch (error) {
    console.error('[SESSION] Error marking session as held:', error);
    throw error;
  }
};

module.exports = mongoose.model('Session', sessionSchema);
