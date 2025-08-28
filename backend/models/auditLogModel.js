const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema(
  {
    // Entity being audited
    entity: {
      type: String,
      enum: ['Session', 'Attendance', 'Class', 'User'],
      required: true,
      index: true,
    },
    // ID of the entity being audited
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
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
    // Who performed the action
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // When the action occurred
    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    // Type of operation
    operation: {
      type: String,
      enum: ['create', 'update', 'delete', 'cancel', 'postpone', 'restore'],
      required: true,
      index: true,
    },
    // Reason code for the operation (especially important for admin overrides)
    reasonCode: {
      type: String,
      enum: ['manual_correction', 'system_policy', 'admin_override', 'data_migration', 'student_request', 'medical_excuse', 'technical_error', 'other'],
      default: null,
      index: true,
    },
    // Human-readable reason text
    reasonText: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    // Field-level changes (before/after values)
    changes: [{
      field: {
        type: String,
        required: true,
      },
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      }
    }],
    // Additional metadata about the operation
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
    // IP address and user agent for security auditing
    clientInfo: {
      ipAddress: {
        type: String,
        default: null,
      },
      userAgent: {
        type: String,
        default: null,
        maxlength: 500,
      },
    },
  },
  {
    timestamps: false, // We use occurredAt instead
  }
);

// Compound indexes for efficient queries
auditLogSchema.index({ entity: 1, entityId: 1, occurredAt: -1 });
auditLogSchema.index({ actorUserId: 1, occurredAt: -1 });
auditLogSchema.index({ schoolId: 1, occurredAt: -1 });
auditLogSchema.index({ operation: 1, reasonCode: 1 });

// Static method to log an audit entry
auditLogSchema.statics.logAction = async function(auditData) {
  try {
    const { entity, entityId, schoolId, actorUserId, operation, reasonCode, reasonText, changes, metadata, clientInfo } = auditData;
    
    console.log(`[AUDIT_LOG] Logging ${operation} action on ${entity} ${entityId} by user ${actorUserId}`);
    
    const auditEntry = new this({
      entity,
      entityId: new mongoose.Types.ObjectId(entityId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      actorUserId: new mongoose.Types.ObjectId(actorUserId),
      operation,
      reasonCode: reasonCode || null,
      reasonText: reasonText || '',
      changes: changes || [],
      metadata: metadata || new Map(),
      clientInfo: clientInfo || {},
    });
    
    await auditEntry.save();
    
    console.log(`[AUDIT_LOG] Created audit log entry ${auditEntry._id}`);
    return auditEntry;
  } catch (error) {
    console.error('[AUDIT_LOG] Error logging audit action:', error);
    throw error;
  }
};

// Static method to get audit trail for an entity
auditLogSchema.statics.getEntityAuditTrail = async function(entity, entityId, options = {}) {
  try {
    console.log(`[AUDIT_QUERY] Getting audit trail for ${entity} ${entityId}`);
    
    const query = { 
      entity, 
      entityId: new mongoose.Types.ObjectId(entityId)
    };
    
    if (options.startDate && options.endDate) {
      query.occurredAt = {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate)
      };
    }
    
    if (options.operation) {
      query.operation = options.operation;
    }
    
    if (options.actorUserId) {
      query.actorUserId = new mongoose.Types.ObjectId(options.actorUserId);
    }
    
    let auditQuery = this.find(query);
    
    if (options.populate) {
      auditQuery = auditQuery.populate('actorUserId', 'name role email');
    }
    
    const auditTrail = await auditQuery
      .sort({ occurredAt: -1 })
      .limit(options.limit || 100);
    
    console.log(`[AUDIT_QUERY] Found ${auditTrail.length} audit entries for ${entity} ${entityId}`);
    return auditTrail;
  } catch (error) {
    console.error('[AUDIT_QUERY] Error getting entity audit trail:', error);
    throw error;
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(actorUserId, options = {}) {
  try {
    console.log(`[AUDIT_QUERY] Getting user activity for ${actorUserId}`);
    
    const query = { 
      actorUserId: new mongoose.Types.ObjectId(actorUserId)
    };
    
    if (options.startDate && options.endDate) {
      query.occurredAt = {
        $gte: new Date(options.startDate),
        $lte: new Date(options.endDate)
      };
    }
    
    if (options.entity) {
      query.entity = options.entity;
    }
    
    if (options.operation) {
      query.operation = options.operation;
    }
    
    let auditQuery = this.find(query);
    
    if (options.populate) {
      auditQuery = auditQuery.populate('actorUserId', 'name role email');
    }
    
    const activity = await auditQuery
      .sort({ occurredAt: -1 })
      .limit(options.limit || 100);
    
    console.log(`[AUDIT_QUERY] Found ${activity.length} activity entries for user ${actorUserId}`);
    return activity;
  } catch (error) {
    console.error('[AUDIT_QUERY] Error getting user activity:', error);
    throw error;
  }
};

// Static method to create field changes array
auditLogSchema.statics.createFieldChanges = function(beforeDoc, afterDoc, fieldsToTrack = []) {
  try {
    const changes = [];
    
    // If no specific fields provided, track common fields
    const defaultFields = ['status', 'scheduledStartAt', 'scheduledEndAt', 'actualStartAt', 'actualEndAt', 
                          'minutesPresent', 'lateMinutes', 'note', 'room', 'teacherId'];
    const fields = fieldsToTrack.length > 0 ? fieldsToTrack : defaultFields;
    
    fields.forEach(field => {
      const beforeValue = beforeDoc ? beforeDoc[field] : null;
      const afterValue = afterDoc ? afterDoc[field] : null;
      
      // Only log if values are different
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push({
          field,
          before: beforeValue,
          after: afterValue
        });
      }
    });
    
    return changes;
  } catch (error) {
    console.error('[AUDIT_LOG] Error creating field changes:', error);
    return [];
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
