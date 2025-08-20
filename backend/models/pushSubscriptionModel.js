const mongoose = require('mongoose');

/**
 * Modern Push Subscription Schema
 * Compatible with 2024 PWA standards for iOS, Android, Windows
 * Stores subscription data with platform detection and metadata
 */
const pushSubscriptionSchema = mongoose.Schema({
  // User and school association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Allow null for superadmin users
    ref: 'School',
    index: true
  },

  // Push subscription core data
  endpoint: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },

  // Subscription metadata
  expirationTime: {
    type: Date,
    default: null
  },
  userAgent: {
    type: String,
    default: ''
  },
  
  // Platform detection for cross-platform optimization
  platform: {
    isIOS: {
      type: Boolean,
      default: false
    },
    isAndroid: {
      type: Boolean,
      default: false  
    },
    isWindows: {
      type: Boolean,
      default: false
    },
    isSafari: {
      type: Boolean,
      default: false
    },
    isChrome: {
      type: Boolean,
      default: false
    },
    isFirefox: {
      type: Boolean,
      default: false
    },
    isPWA: {
      type: Boolean,
      default: false
    },
    browserName: {
      type: String,
      default: ''
    },
    osName: {
      type: String,
      default: ''
    }
  },

  // Subscription status and management
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Push notification preferences
  preferences: {
    grades: {
      type: Boolean,
      default: true
    },
    assignments: {
      type: Boolean,
      default: true
    },
    announcements: {
      type: Boolean,
      default: true
    },
    events: {
      type: Boolean,
      default: true
    },
    urgent: {
      type: Boolean,
      default: true
    }
  },

  // Analytics and debugging
  stats: {
    totalPushes: {
      type: Number,
      default: 0
    },
    successfulPushes: {
      type: Number,
      default: 0
    },
    failedPushes: {
      type: Number,
      default: 0
    },
    lastPushSent: {
      type: Date,
      default: null
    },
    lastPushSuccess: {
      type: Date,
      default: null
    },
    lastError: {
      message: String,
      timestamp: Date,
      statusCode: Number
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * Indexes for optimal query performance
 */
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });
pushSubscriptionSchema.index({ schoolId: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ createdAt: -1 });
pushSubscriptionSchema.index({ 'platform.isIOS': 1 });
pushSubscriptionSchema.index({ 'platform.isAndroid': 1 });
pushSubscriptionSchema.index({ 'platform.isPWA': 1 });

/**
 * Instance methods
 */

// Update subscription statistics
pushSubscriptionSchema.methods.updateStats = function(success, error = null) {
  this.stats.totalPushes = (this.stats.totalPushes || 0) + 1;
  this.stats.lastPushSent = new Date();
  this.lastUsed = new Date();

  if (success) {
    this.stats.successfulPushes = (this.stats.successfulPushes || 0) + 1;
    this.stats.lastPushSuccess = new Date();
  } else {
    this.stats.failedPushes = (this.stats.failedPushes || 0) + 1;
    if (error) {
      this.stats.lastError = {
        message: error.message || 'Unknown error',
        timestamp: new Date(),
        statusCode: error.statusCode || 0
      };
    }
  }

  return this.save();
};

// Check if subscription is expired
pushSubscriptionSchema.methods.isExpired = function() {
  if (!this.expirationTime) return false;
  return new Date() > this.expirationTime;
};

// Get platform summary
pushSubscriptionSchema.methods.getPlatformSummary = function() {
  const platform = this.platform || {};
  return {
    os: platform.osName || 'Unknown',
    browser: platform.browserName || 'Unknown',
    isPWA: platform.isPWA || false,
    isIOS: platform.isIOS || false,
    isAndroid: platform.isAndroid || false,
    isWindows: platform.isWindows || false
  };
};

// Update subscription keys and metadata
pushSubscriptionSchema.methods.updateSubscription = function(newKeys, userAgent, platform) {
  this.keys = newKeys;
  this.userAgent = userAgent || this.userAgent;
  this.platform = { ...this.platform, ...platform };
  this.lastUpdated = new Date();
  this.lastUsed = new Date();
  
  return this.save();
};

/**
 * Static methods
 */

// Find active subscriptions for user
pushSubscriptionSchema.statics.findActiveForUser = function(userId) {
  return this.find({ 
    userId: userId, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Find active subscriptions for school
pushSubscriptionSchema.statics.findActiveForSchool = function(schoolId) {
  return this.find({ 
    schoolId: schoolId, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Find subscriptions by platform
pushSubscriptionSchema.statics.findByPlatform = function(platformQuery, schoolId = null) {
  const query = { 
    isActive: true,
    ...platformQuery
  };
  
  if (schoolId) {
    query.schoolId = schoolId;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Clean up expired subscriptions
pushSubscriptionSchema.statics.cleanupExpired = function() {
  const now = new Date();
  return this.updateMany(
    {
      expirationTime: { $lt: now },
      isActive: true
    },
    {
      isActive: false,
      lastUpdated: now
    }
  );
};

// Get subscription statistics
pushSubscriptionSchema.statics.getStats = async function(schoolId = null) {
  const matchQuery = schoolId ? { schoolId } : {};
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSubscriptions: { $sum: 1 },
        activeSubscriptions: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        iosSubscriptions: {
          $sum: { $cond: [{ $eq: ['$platform.isIOS', true] }, 1, 0] }
        },
        androidSubscriptions: {
          $sum: { $cond: [{ $eq: ['$platform.isAndroid', true] }, 1, 0] }
        },
        windowsSubscriptions: {
          $sum: { $cond: [{ $eq: ['$platform.isWindows', true] }, 1, 0] }
        },
        pwaSubscriptions: {
          $sum: { $cond: [{ $eq: ['$platform.isPWA', true] }, 1, 0] }
        },
        totalPushes: { $sum: '$stats.totalPushes' },
        successfulPushes: { $sum: '$stats.successfulPushes' },
        failedPushes: { $sum: '$stats.failedPushes' }
      }
    }
  ]);

  return stats[0] || {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    iosSubscriptions: 0,
    androidSubscriptions: 0,
    windowsSubscriptions: 0,
    pwaSubscriptions: 0,
    totalPushes: 0,
    successfulPushes: 0,
    failedPushes: 0
  };
};

/**
 * Pre-save middleware
 */
pushSubscriptionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

/**
 * Pre-remove middleware to update statistics
 */
pushSubscriptionSchema.pre('remove', function(next) {
  console.log(`[PushSubscription] Removing subscription for user ${this.userId}, endpoint: ${this.endpoint.substring(0, 50)}...`);
  next();
});

/**
 * Error handling
 */
pushSubscriptionSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    console.error(`[PushSubscription] Duplicate endpoint detected: ${error.keyValue?.endpoint?.substring(0, 50)}...`);
    next(new Error('Push subscription already exists for this endpoint'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
