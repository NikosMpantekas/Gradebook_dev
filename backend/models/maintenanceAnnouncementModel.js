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
    
    const query = {
      isActive: true,
      showOnDashboard: true,
      scheduledStart: { $lte: currentTime },
      scheduledEnd: { $gte: currentTime }
    };
    
    // Filter by user role if specified
    if (userRole) {
      query.targetRoles = { $in: [userRole] };
    }
    
    const announcements = await this.find(query)
      .populate('createdBy', 'name role')
      .populate('lastModifiedBy', 'name role')
      .sort({ scheduledStart: -1 })
      .limit(5); // Limit to 5 most recent active announcements
    
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
