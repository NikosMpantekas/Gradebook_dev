const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema(
  {
    // Session reference (required)
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    // Student reference (required)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    // Class reference for easier queries
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    // Attendance status
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused', 'remote'],
      required: true,
      index: true,
    },
    // Time tracking for present/late students
    minutesPresent: {
      type: Number,
      min: 0,
      default: null,
    },
    // Late tracking
    lateMinutes: {
      type: Number,
      min: 0,
      default: null,
    },
    // Optional note/reason
    note: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Source of attendance marking
    source: {
      type: String,
      enum: ['manual', 'qr', 'import', 'automatic'],
      default: 'manual',
      index: true,
    },
    // Audit tracking - who marked this
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // When this was marked/last updated
    markedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Version for optimistic locking
    version: {
      type: Number,
      default: 1,
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

// Compound unique index for idempotency - one attendance per session per student
attendanceSchema.index(
  { sessionId: 1, studentId: 1 }, 
  { unique: true, name: 'attendance_session_student_unique' }
);

// Performance indexes for common queries
attendanceSchema.index({ schoolId: 1, status: 1 });
attendanceSchema.index({ classId: 1, status: 1 });
attendanceSchema.index({ studentId: 1, markedAt: 1 });
attendanceSchema.index({ markedBy: 1, markedAt: -1 });
attendanceSchema.index({ source: 1, status: 1 });

// Static method for idempotent upsert attendance
attendanceSchema.statics.upsertAttendance = async function(attendanceData) {
  try {
    const { sessionId, studentId, status, minutesPresent, lateMinutes, note, source, markedBy } = attendanceData;
    
    console.log(`[ATTENDANCE_UPSERT] Upserting attendance for session ${sessionId}, student ${studentId}, status: ${status}`);

    // First, verify the session exists and is not canceled
    const Session = mongoose.model('Session');
    const session = await Session.findById(sessionId).populate('classId');
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.status === 'canceled') {
      const error = new Error('Cannot mark attendance on canceled session');
      error.statusCode = 409; // Conflict
      throw error;
    }

    // Warn if session is postponed
    if (session.status === 'postponed') {
      console.warn(`[ATTENDANCE_UPSERT] Warning: Marking attendance on postponed session ${sessionId}`);
    }

    // Auto-mark session as held if this is first attendance on planned session
    if (session.status === 'planned') {
      await session.markAsHeld();
    }

    // Prepare attendance data with audit info
    const updateData = {
      status,
      note: note || '',
      source: source || 'manual',
      markedBy,
      markedAt: new Date(),
      schoolId: session.classId.schoolId,
      classId: session.classId._id,
    };

    // Add time tracking based on status
    if (status === 'present' || status === 'late' || status === 'remote') {
      if (minutesPresent !== undefined && minutesPresent !== null) {
        updateData.minutesPresent = Math.max(0, minutesPresent);
      }
    } else {
      updateData.minutesPresent = null;
    }

    if (status === 'late' && lateMinutes !== undefined && lateMinutes !== null) {
      updateData.lateMinutes = Math.max(0, lateMinutes);
    } else {
      updateData.lateMinutes = null;
    }

    // Increment version for optimistic locking
    updateData.$inc = { version: 1 };

    // Idempotent upsert with compound unique index enforcement
    const result = await this.findOneAndUpdate(
      { 
        sessionId, 
        studentId 
      },
      { 
        $set: updateData,
        $setOnInsert: { 
          sessionId, 
          studentId,
          version: 1,
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true,
      }
    ).populate('sessionId studentId markedBy');

    console.log(`[ATTENDANCE_UPSERT] Successfully upserted attendance ${result._id} for student ${studentId}`);
    return result;
  } catch (error) {
    console.error('[ATTENDANCE_UPSERT] Error upserting attendance:', error);
    throw error;
  }
};

// Static method to get attendance for a session
attendanceSchema.statics.getSessionAttendance = async function(sessionId, options = {}) {
  try {
    console.log(`[ATTENDANCE_QUERY] Getting attendance for session ${sessionId}`);
    
    const query = { sessionId, active: true };
    
    let attendanceQuery = this.find(query);
    
    if (options.populate) {
      attendanceQuery = attendanceQuery.populate('studentId', 'name email role');
      if (options.includeMarkedBy) {
        attendanceQuery = attendanceQuery.populate('markedBy', 'name role');
      }
    }
    
    const attendance = await attendanceQuery.sort({ markedAt: -1 });
    
    console.log(`[ATTENDANCE_QUERY] Found ${attendance.length} attendance records for session ${sessionId}`);
    return attendance;
  } catch (error) {
    console.error('[ATTENDANCE_QUERY] Error getting session attendance:', error);
    throw error;
  }
};

// Static method to get student attendance history
attendanceSchema.statics.getStudentAttendance = async function(studentId, startDate, endDate, options = {}) {
  try {
    console.log(`[ATTENDANCE_QUERY] Getting attendance history for student ${studentId} from ${startDate} to ${endDate}`);
    
    const Session = mongoose.model('Session');
    
    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $unwind: '$session'
      },
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId),
          active: true,
          'session.scheduledStartAt': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $sort: { 'session.scheduledStartAt': -1 }
      }
    ];

    if (options.classId) {
      pipeline[2].$match.classId = new mongoose.Types.ObjectId(options.classId);
    }

    if (options.populate) {
      pipeline.push(
        {
          $lookup: {
            from: 'classes',
            localField: 'classId',
            foreignField: '_id',
            as: 'class'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'markedBy',
            foreignField: '_id',
            as: 'markedByUser'
          }
        }
      );
    }

    const attendance = await this.aggregate(pipeline);
    
    console.log(`[ATTENDANCE_QUERY] Found ${attendance.length} attendance records for student ${studentId}`);
    return attendance;
  } catch (error) {
    console.error('[ATTENDANCE_QUERY] Error getting student attendance:', error);
    throw error;
  }
};

// Instance method to apply late-to-absent policy
attendanceSchema.methods.applyLatePolicy = function(lateThresholdMinutes = 15) {
  try {
    if (this.status === 'late' && this.lateMinutes > lateThresholdMinutes) {
      console.log(`[ATTENDANCE_POLICY] Applying late policy: ${this.lateMinutes} > ${lateThresholdMinutes}, marking as absent`);
      this.status = 'absent';
      this.note += ` [Auto-marked absent: late by ${this.lateMinutes} minutes]`;
      return true;
    }
    return false;
  } catch (error) {
    console.error('[ATTENDANCE_POLICY] Error applying late policy:', error);
    throw error;
  }
};

// Pre-save middleware to validate business rules
attendanceSchema.pre('save', function(next) {
  try {
    // Ensure minutes present doesn't exceed session duration if we have session data
    if (this.minutesPresent !== null && this.minutesPresent < 0) {
      this.minutesPresent = 0;
    }
    
    if (this.lateMinutes !== null && this.lateMinutes < 0) {
      this.lateMinutes = 0;
    }

    // Clear inappropriate fields based on status
    if (['absent', 'excused'].includes(this.status)) {
      this.minutesPresent = null;
      this.lateMinutes = null;
    }
    
    if (this.status !== 'late') {
      this.lateMinutes = null;
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
