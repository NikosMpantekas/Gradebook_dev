const Session = require('../models/sessionModel');
const Class = require('../models/classModel');
const AuditLog = require('../models/auditLogModel');
const { setDocumentAuditContext } = require('../middleware/auditLogMiddleware');

class SessionService {
  /**
   * Generate sessions for a class within a date range
   */
  async generateSessions(classId, startDate, endDate, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Generating sessions for class ${classId} from ${startDate} to ${endDate}`);
      
      // Validate class exists and user has access
      const classData = await Class.findById(classId);
      if (!classData) {
        const error = new Error('Class not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if user has access to this class's school
      if (auditContext.schoolId && classData.schoolId.toString() !== auditContext.schoolId.toString()) {
        const error = new Error('Access denied to this class');
        error.statusCode = 403;
        throw error;
      }

      // Generate sessions using model static method
      const result = await Session.generateSessionsForClass(classId, startDate, endDate);
      
      // Log the generation action
      if (result.upsertedCount > 0) {
        await AuditLog.logAction({
          entity: 'Session',
          entityId: classId, // Using classId as reference
          schoolId: auditContext.schoolId,
          actorUserId: auditContext.actorUserId,
          operation: 'create',
          reasonCode: 'system_policy',
          reasonText: `Generated ${result.upsertedCount} sessions for date range ${startDate} to ${endDate}`,
          changes: [],
          metadata: new Map([
            ['startDate', startDate],
            ['endDate', endDate],
            ['generatedCount', result.upsertedCount]
          ]),
          clientInfo: auditContext.clientInfo || {}
        });
      }

      return {
        success: true,
        message: `Generated ${result.upsertedCount} new sessions, ${result.modifiedCount} already existed`,
        data: {
          newSessions: result.upsertedCount,
          existingSessions: result.modifiedCount,
          classId,
          dateRange: { startDate, endDate }
        }
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error generating sessions:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a class with filtering
   */
  async getClassSessions(classId, filters = {}, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Getting sessions for class ${classId}`);
      
      // Build query
      const query = { 
        classId,
        active: true
      };

      // Add filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.from || filters.to) {
        query.scheduledStartAt = {};
        if (filters.from) {
          query.scheduledStartAt.$gte = new Date(filters.from);
        }
        if (filters.to) {
          query.scheduledStartAt.$lte = new Date(filters.to);
        }
      }

      // Check school access
      if (auditContext.schoolId) {
        query.schoolId = auditContext.schoolId;
      }

      const sessions = await Session.find(query)
        .populate('classId', 'name subject direction schoolBranch')
        .populate('teacherId', 'name email role')
        .sort({ scheduledStartAt: 1 })
        .limit(filters.limit || 100);

      return {
        success: true,
        data: sessions,
        count: sessions.length
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error getting class sessions:', error);
      throw error;
    }
  }

  /**
   * Get single session by ID
   */
  async getSession(sessionId, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Getting session ${sessionId}`);
      
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      })
        .populate('classId', 'name subject direction schoolBranch teachers students')
        .populate('teacherId', 'name email role')
        .populate('originalSessionId');

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        success: true,
        data: session
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error getting session:', error);
      throw error;
    }
  }

  /**
   * Update session details
   */
  async updateSession(sessionId, updateData, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Updating session ${sessionId}`);
      
      // Get original session
      const originalSession = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      });

      if (!originalSession) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if session can be updated
      if (originalSession.status === 'canceled') {
        const error = new Error('Cannot update canceled session');
        error.statusCode = 409;
        throw error;
      }

      // Validate status transitions
      if (updateData.status) {
        const validTransitions = {
          'planned': ['held', 'canceled', 'postponed'],
          'held': ['held'], // Can only update details
          'canceled': [], // Cannot change from canceled
          'postponed': ['canceled'] // Can only cancel postponed
        };

        if (!validTransitions[originalSession.status].includes(updateData.status)) {
          const error = new Error(`Invalid status transition from ${originalSession.status} to ${updateData.status}`);
          error.statusCode = 422;
          throw error;
        }
      }

      // Set audit context
      setDocumentAuditContext(originalSession, auditContext);

      // Apply updates
      Object.keys(updateData).forEach(key => {
        if (['status', 'actualStartAt', 'actualEndAt', 'room', 'notes', 'teacherId'].includes(key)) {
          originalSession[key] = updateData[key];
        }
      });

      await originalSession.save();

      // Manual audit log for important updates
      await originalSession.logAudit(
        'update',
        auditContext.actorUserId,
        updateData.reasonCode || 'manual_correction',
        updateData.reasonText || 'Session details updated',
        auditContext.clientInfo,
        new Map(Object.entries(updateData))
      );

      return {
        success: true,
        message: 'Session updated successfully',
        data: originalSession
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error updating session:', error);
      throw error;
    }
  }

  /**
   * Postpone a session
   */
  async postponeSession(sessionId, postponeData, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Postponing session ${sessionId}`);
      
      const { newScheduledStartAt, newScheduledEndAt, reason } = postponeData;

      // Get original session
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      });

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      if (session.status !== 'planned') {
        const error = new Error(`Cannot postpone session with status: ${session.status}`);
        error.statusCode = 409;
        throw error;
      }

      // Postpone using model method
      const newSession = await session.postpone(
        newScheduledStartAt, 
        newScheduledEndAt, 
        reason, 
        auditContext.actorUserId
      );

      // Log audit for both sessions
      await AuditLog.logAction({
        entity: 'Session',
        entityId: session._id,
        schoolId: auditContext.schoolId,
        actorUserId: auditContext.actorUserId,
        operation: 'postpone',
        reasonCode: 'manual_correction',
        reasonText: reason,
        changes: [
          { field: 'status', before: 'planned', after: 'postponed' },
          { field: 'newSessionId', before: null, after: newSession._id }
        ],
        clientInfo: auditContext.clientInfo || {}
      });

      return {
        success: true,
        message: 'Session postponed successfully',
        data: {
          originalSession: session,
          newSession: newSession
        }
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error postponing session:', error);
      throw error;
    }
  }

  /**
   * Cancel a session
   */
  async cancelSession(sessionId, cancelData, auditContext) {
    try {
      console.log(`[SESSION_SERVICE] Canceling session ${sessionId}`);
      
      const { reason } = cancelData;

      // Get session
      const session = await Session.findOne({ 
        _id: sessionId, 
        active: true,
        ...(auditContext.schoolId && { schoolId: auditContext.schoolId })
      });

      if (!session) {
        const error = new Error('Session not found');
        error.statusCode = 404;
        throw error;
      }

      if (session.status === 'canceled') {
        const error = new Error('Session is already canceled');
        error.statusCode = 409;
        throw error;
      }

      // Cancel using model method
      await session.cancel(reason, auditContext.actorUserId);

      // Log audit
      await AuditLog.logAction({
        entity: 'Session',
        entityId: session._id,
        schoolId: auditContext.schoolId,
        actorUserId: auditContext.actorUserId,
        operation: 'cancel',
        reasonCode: 'manual_correction',
        reasonText: reason,
        changes: [
          { field: 'status', before: session.status, after: 'canceled' }
        ],
        clientInfo: auditContext.clientInfo || {}
      });

      return {
        success: true,
        message: 'Session canceled successfully',
        data: session
      };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error canceling session:', error);
      throw error;
    }
  }

  /**
   * Check if user can edit session (time window policy)
   */
  canEditSession(session, userRole, windowHours = 24) {
    try {
      if (userRole === 'admin' || userRole === 'superadmin') {
        return { canEdit: true, reason: 'Admin privileges' };
      }

      if (session.status === 'canceled') {
        return { canEdit: false, reason: 'Session is canceled' };
      }

      const now = new Date();
      const sessionEnd = session.actualEndAt || session.scheduledEndAt;
      const windowEnd = new Date(sessionEnd.getTime() + (windowHours * 60 * 60 * 1000));

      if (now > windowEnd) {
        return { 
          canEdit: false, 
          reason: `Edit window expired (${windowHours}h after session end)` 
        };
      }

      return { canEdit: true, reason: 'Within edit window' };
    } catch (error) {
      console.error('[SESSION_SERVICE] Error checking edit permissions:', error);
      return { canEdit: false, reason: 'Error checking permissions' };
    }
  }
}

module.exports = new SessionService();
