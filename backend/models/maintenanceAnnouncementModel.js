const mongoose = require('mongoose');

const maintenanceAnnouncementSchema = mongoose.Schema(
  {
    // Title of the maintenance announcement
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    
    // Detailed message about the maintenance
    message: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    
    // Maintenance type/severity
    type: {
      type: String,
      enum: ['info', 'warning', 'critical', 'scheduled'],
      default: 'info'
    },
    
    // When the maintenance is scheduled to start
    scheduledStart: {
      type: Date,
      required: true
    },
    
    // When the maintenance is scheduled to end
    scheduledEnd: {
      type: Date,
      required: true
    },
    
    // Whether the announcement is currently active
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Whether to show this announcement on all dashboards
    showOnDashboard: {
      type: Boolean,
      default: true
    },
    
    // Target roles that should see this announcement
    targetRoles: [{
      type: String,
      enum: ['admin', 'teacher', 'student', 'parent', 'secretary'],
      default: ['admin', 'teacher', 'student', 'parent', 'secretary']
    }],
    
    // Admin who created this announcement
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Admin who last modified this announcement
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Optional affected services/features
    affectedServices: [{
      type: String,
      trim: true
    }],
    
    // Announcement history
    history: [{
      action: {
        type: String,
        enum: ['created', 'updated', 'activated', 'deactivated', 'deleted'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      changes: {
        type: String,
        maxlength: 200
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of active announcements
maintenanceAnnouncementSchema.index({ isActive: 1, showOnDashboard: 1 });
maintenanceAnnouncementSchema.index({ scheduledStart: 1, scheduledEnd: 1 });

// Static method to get active announcements for dashboard
maintenanceAnnouncementSchema.statics.getActiveAnnouncements = async function(userRole = null) {
  try {
    const currentTime = new Date();
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Searching for announcements for role: ${userRole} at time: ${currentTime}`);
    
    // Modified query to show announcements that are either:
    // 1. Currently active (between scheduledStart and scheduledEnd)
    // 2. Starting within the next 24 hours (upcoming announcements)
    const next24Hours = new Date(currentTime.getTime() + (24 * 60 * 60 * 1000));
    
    const query = {
      isActive: true,
      showOnDashboard: true,
      $or: [
        // Currently active announcements
        {
          scheduledStart: { $lte: currentTime },
          scheduledEnd: { $gte: currentTime }
        },
        // Future announcements starting within 24 hours
        {
          scheduledStart: { 
            $gt: currentTime, 
            $lte: next24Hours 
          }
        }
      ]
    };
    
    // Filter by user role if specified
    if (userRole) {
      query.targetRoles = { $in: [userRole] };
    }
    
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Query:`, JSON.stringify(query, null, 2));
    
    const announcements = await this.find(query)
      .populate('createdBy', 'name role')
      .populate('lastModifiedBy', 'name role')
      .sort({ scheduledStart: 1 }) // Sort by start time ascending to show upcoming first
      .limit(10); // Increased limit to show more announcements
    
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Found ${announcements.length} announcements matching query`);
    
    // Enhanced logging for debugging
    const allAnnouncements = await this.find({ isActive: true }).select('title targetRoles scheduledStart scheduledEnd showOnDashboard');
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Total active announcements in DB: ${allAnnouncements.length}`);
    allAnnouncements.forEach(ann => {
      const status = ann.scheduledStart <= currentTime && ann.scheduledEnd >= currentTime ? 'ACTIVE' :
                    ann.scheduledStart > currentTime ? 'UPCOMING' : 'EXPIRED';
      console.log(`  - "${ann.title}" | roles: ${ann.targetRoles} | start: ${ann.scheduledStart} | end: ${ann.scheduledEnd} | status: ${status} | showOnDashboard: ${ann.showOnDashboard}`);
    });
    
    return announcements;
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error getting active announcements:', error);
    return [];
  }
};

// Static method to get all announcements for superadmin management
maintenanceAnnouncementSchema.statics.getAllAnnouncements = async function() {
  try {
    const announcements = await this.find()
      .populate('createdBy', 'name role email')
      .populate('lastModifiedBy', 'name role email')
      .populate('history.modifiedBy', 'name role')
      .sort({ createdAt: -1 });
    
    return announcements;
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error getting all announcements:', error);
    throw error;
  }
};

// Method to check if announcement is currently active
maintenanceAnnouncementSchema.methods.isCurrentlyActive = function() {
  const currentTime = new Date();
  return this.isActive && 
         this.scheduledStart <= currentTime && 
         this.scheduledEnd >= currentTime;
};

// Method to add history entry
maintenanceAnnouncementSchema.methods.addHistory = function(action, modifiedBy, changes = '') {
  this.history.push({
    action,
    modifiedBy,
    changes
  });
  
  // Keep only last 10 history entries
  if (this.history.length > 10) {
    this.history = this.history.slice(-10);
  }
};

module.exports = mongoose.model('MaintenanceAnnouncement', maintenanceAnnouncementSchema);
