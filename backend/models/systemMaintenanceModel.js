const mongoose = require('mongoose');

const systemMaintenanceSchema = mongoose.Schema(
  {
    // Maintenance mode status
    isMaintenanceMode: {
      type: Boolean,
      default: false,
      required: true
    },
    
    // Maintenance message to display to users
    maintenanceMessage: {
      type: String,
      default: 'The system is currently under maintenance. Please be patient while we work to improve your experience.',
      maxlength: 500
    },
    
    // Estimated time of completion
    estimatedCompletion: {
      type: Date,
      default: null
    },
    
    // Admin who enabled/disabled maintenance mode
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Optional reason for maintenance
    reason: {
      type: String,
      maxlength: 200,
      default: ''
    },
    
    // Allow specific roles to bypass maintenance (superadmin always bypasses)
    allowedRoles: [{
      type: String,
      enum: ['superadmin', 'admin', 'teacher', 'student', 'parent'],
      default: []
    }],
    
    // Track maintenance history
    maintenanceHistory: [{
      action: {
        type: String,
        enum: ['enabled', 'disabled', 'updated'],
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
      reason: String,
      previousState: {
        isMaintenanceMode: Boolean,
        maintenanceMessage: String
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Ensure only one maintenance document exists (singleton pattern)
systemMaintenanceSchema.index({}, { unique: true });

// Static method to get current maintenance status
systemMaintenanceSchema.statics.getCurrentStatus = async function() {
  try {
    let maintenanceDoc = await this.findOne();
    
    // Create default document if none exists
    if (!maintenanceDoc) {
      // Create a placeholder ObjectId for system initialization
      const placeholderAdminId = new mongoose.Types.ObjectId('000000000000000000000001');
      maintenanceDoc = await this.create({
        isMaintenanceMode: false,
        lastModifiedBy: placeholderAdminId,
        maintenanceMessage: 'The system is currently under maintenance. Please be patient while we work to improve your experience.',
        maintenanceHistory: []
      });
      console.log('[MAINTENANCE] Created default maintenance document');
    }
    
    return maintenanceDoc;
  } catch (error) {
    console.error('[MAINTENANCE] Error in getCurrentStatus:', error);
    throw error;
  }
};

// Static method to update maintenance status
systemMaintenanceSchema.statics.updateStatus = async function(updateData, modifiedBy) {
  let maintenanceDoc = await this.getCurrentStatus();
  
  // Store previous state for history
  const previousState = {
    isMaintenanceMode: maintenanceDoc.isMaintenanceMode,
    maintenanceMessage: maintenanceDoc.maintenanceMessage
  };
  
  // Update fields
  Object.keys(updateData).forEach(key => {
    if (key !== 'maintenanceHistory') {
      maintenanceDoc[key] = updateData[key];
    }
  });
  
  maintenanceDoc.lastModifiedBy = modifiedBy;
  
  // Add to history
  const action = updateData.isMaintenanceMode !== undefined ? 
    (updateData.isMaintenanceMode ? 'enabled' : 'disabled') : 'updated';
    
  maintenanceDoc.maintenanceHistory.push({
    action,
    modifiedBy,
    reason: updateData.reason || '',
    previousState
  });
  
  // Keep only last 20 history entries
  if (maintenanceDoc.maintenanceHistory.length > 20) {
    maintenanceDoc.maintenanceHistory = maintenanceDoc.maintenanceHistory.slice(-20);
  }
  
  await maintenanceDoc.save();
  return maintenanceDoc;
};

// Method to check if a user role can bypass maintenance
systemMaintenanceSchema.methods.canBypassMaintenance = function(userRole) {
  // Superadmin always bypasses
  if (userRole === 'superadmin') return true;
  
  // Check if role is in allowed list
  return this.allowedRoles.includes(userRole);
};

module.exports = mongoose.model('SystemMaintenance', systemMaintenanceSchema);
