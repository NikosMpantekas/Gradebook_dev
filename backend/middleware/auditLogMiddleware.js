const AuditLog = require('../models/auditLogModel');

/**
 * Mongoose plugin for automatic audit logging
 * Tracks create, update, and delete operations with field-level changes
 */
function auditLogPlugin(schema, options = {}) {
  const entityType = options.entityType || 'Unknown';
  const fieldsToTrack = options.fieldsToTrack || [];
  const excludeFields = options.excludeFields || ['updatedAt', '__v', 'version'];

  // Store original document for comparison
  let originalDoc = null;

  // Pre-save hook to capture original state
  schema.pre(['save', 'findOneAndUpdate'], async function() {
    try {
      if (this.isNew) {
        originalDoc = null;
      } else {
        // For save operations, this is the document
        if (this.constructor.name === 'model') {
          originalDoc = await this.constructor.findById(this._id).lean();
        } else {
          // For findOneAndUpdate, we need to find the original
          const Model = this.model || this.constructor;
          originalDoc = await Model.findOne(this.getFilter()).lean();
        }
      }
    } catch (error) {
      console.error('[AUDIT_PLUGIN] Error capturing original document:', error);
      originalDoc = null;
    }
  });

  // Post-save hook to log the audit trail
  schema.post('save', async function(doc) {
    try {
      await logAuditAction(doc, originalDoc, 'save', entityType, fieldsToTrack, excludeFields);
    } catch (error) {
      console.error('[AUDIT_PLUGIN] Error logging save audit:', error);
    }
  });

  // Post-findOneAndUpdate hook
  schema.post('findOneAndUpdate', async function(doc) {
    try {
      if (doc) {
        await logAuditAction(doc, originalDoc, 'update', entityType, fieldsToTrack, excludeFields);
      }
    } catch (error) {
      console.error('[AUDIT_PLUGIN] Error logging update audit:', error);
    }
  });

  // Post-remove hook
  schema.post('remove', async function(doc) {
    try {
      await logAuditAction(doc, doc, 'delete', entityType, fieldsToTrack, excludeFields);
    } catch (error) {
      console.error('[AUDIT_PLUGIN] Error logging delete audit:', error);
    }
  });

  // Add manual audit logging method to schema
  schema.methods.logAudit = async function(operation, actorUserId, reasonCode, reasonText, clientInfo, metadata) {
    try {
      await logAuditAction(
        this, 
        originalDoc, 
        operation, 
        entityType, 
        fieldsToTrack, 
        excludeFields,
        {
          actorUserId,
          reasonCode,
          reasonText,
          clientInfo,
          metadata
        }
      );
    } catch (error) {
      console.error('[AUDIT_PLUGIN] Error in manual audit logging:', error);
      throw error;
    }
  };
}

/**
 * Core audit logging function
 */
async function logAuditAction(currentDoc, originalDoc, operation, entityType, fieldsToTrack, excludeFields, auditContext = {}) {
  try {
    // Extract audit context from request or provided context
    const actorUserId = auditContext.actorUserId || currentDoc.auditContext?.actorUserId || null;
    const schoolId = currentDoc.schoolId || currentDoc.auditContext?.schoolId || null;
    
    if (!actorUserId || !schoolId) {
      console.warn('[AUDIT_PLUGIN] Missing required audit context (actorUserId or schoolId)');
      return;
    }

    // Determine operation type
    let auditOperation = operation;
    if (operation === 'save') {
      auditOperation = originalDoc ? 'update' : 'create';
    }

    // Calculate field changes
    const changes = calculateFieldChanges(originalDoc, currentDoc, fieldsToTrack, excludeFields);

    // Create audit log entry
    const auditData = {
      entity: entityType,
      entityId: currentDoc._id,
      schoolId: schoolId,
      actorUserId: actorUserId,
      operation: auditOperation,
      reasonCode: auditContext.reasonCode || null,
      reasonText: auditContext.reasonText || '',
      changes: changes,
      metadata: auditContext.metadata || new Map(),
      clientInfo: auditContext.clientInfo || {},
    };

    await AuditLog.logAction(auditData);
    
    console.log(`[AUDIT_PLUGIN] Logged ${auditOperation} action for ${entityType} ${currentDoc._id}`);
  } catch (error) {
    console.error('[AUDIT_PLUGIN] Error in logAuditAction:', error);
    // Don't throw - audit failures shouldn't break the main operation
  }
}

/**
 * Calculate field-level changes between documents
 */
function calculateFieldChanges(beforeDoc, afterDoc, fieldsToTrack, excludeFields) {
  try {
    const changes = [];
    
    if (!afterDoc) return changes;

    // Get all fields to check
    const afterFields = Object.keys(afterDoc.toObject ? afterDoc.toObject() : afterDoc);
    const beforeFields = beforeDoc ? Object.keys(beforeDoc) : [];
    const allFields = [...new Set([...afterFields, ...beforeFields])];

    // Filter fields based on tracking preferences
    let fieldsToCheck = allFields;
    
    if (fieldsToTrack.length > 0) {
      fieldsToCheck = allFields.filter(field => fieldsToTrack.includes(field));
    }
    
    fieldsToCheck = fieldsToCheck.filter(field => !excludeFields.includes(field));

    // Compare fields
    fieldsToCheck.forEach(field => {
      const beforeValue = beforeDoc ? beforeDoc[field] : null;
      const afterValue = afterDoc[field] || null;

      // Convert to comparable format
      const beforeStr = normalizeValue(beforeValue);
      const afterStr = normalizeValue(afterValue);

      if (beforeStr !== afterStr) {
        changes.push({
          field,
          before: beforeValue,
          after: afterValue
        });
      }
    });

    return changes;
  } catch (error) {
    console.error('[AUDIT_PLUGIN] Error calculating field changes:', error);
    return [];
  }
}

/**
 * Normalize values for comparison
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Middleware to attach audit context to requests
 */
const attachAuditContext = (req, res, next) => {
  try {
    // Extract audit context from authenticated user
    if (req.user) {
      req.auditContext = {
        actorUserId: req.user._id || req.user.id,
        schoolId: req.user.schoolId,
        clientInfo: {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }
      };
    }
    
    next();
  } catch (error) {
    console.error('[AUDIT_MIDDLEWARE] Error attaching audit context:', error);
    next();
  }
};

/**
 * Helper to set audit context on documents before save
 */
const setDocumentAuditContext = (doc, auditContext) => {
  try {
    if (doc && auditContext) {
      doc.auditContext = auditContext;
    }
  } catch (error) {
    console.error('[AUDIT_HELPER] Error setting document audit context:', error);
  }
};

module.exports = {
  auditLogPlugin,
  attachAuditContext,
  setDocumentAuditContext,
  logAuditAction
};
