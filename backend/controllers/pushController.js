const asyncHandler = require('express-async-handler');
const webpush = require('web-push');
const PushSubscription = require('../models/pushSubscriptionModel');

/**
 * Modern Push Notification Controller
 * Cross-platform compatible push notification endpoints
 * Follows 2024 PWA standards for iOS, Android, Windows
 */

// Configure VAPID keys with proper validation
let vapidConfigured = false;

try {
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  console.log('[PushController] VAPID configuration check:', {
    hasEmail: !!vapidEmail,
    hasPublicKey: !!vapidPublicKey,
    hasPrivateKey: !!vapidPrivateKey,
    emailValue: vapidEmail || 'NOT_SET',
    publicKeyLength: vapidPublicKey?.length || 0,
    privateKeyLength: vapidPrivateKey?.length || 0,
    publicKeyFormat: vapidPublicKey ? (vapidPublicKey.startsWith('B') ? 'Valid Base64' : 'Invalid Format') : 'Missing',
    privateKeyFormat: vapidPrivateKey ? (vapidPrivateKey.length === 43 ? 'Valid Length' : `Invalid Length: ${vapidPrivateKey.length}`) : 'Missing',
    environment: process.env.NODE_ENV || 'unknown'
  });

  // Log first few characters for debugging (safe)
  if (vapidPublicKey) {
    console.log('[PushController] Public key preview:', vapidPublicKey.substring(0, 20) + '...');
  }
  if (vapidPrivateKey) {
    console.log('[PushController] Private key preview:', vapidPrivateKey.substring(0, 10) + '...');
  }

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    console.error('[PushController] VAPID keys incomplete - push notifications will fail');
    console.error('[PushController] Missing:', {
      email: !vapidEmail,
      publicKey: !vapidPublicKey,
      privateKey: !vapidPrivateKey
    });
  } else {
    // Set VAPID details with proper email format
    const emailSubject = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`;
    
    webpush.setVapidDetails(
      emailSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    vapidConfigured = true;
    console.log('[PushController] VAPID keys configured successfully');
    console.log('[PushController] Email subject:', emailSubject);
  }
} catch (error) {
  console.error('[PushController] Error configuring VAPID keys:', error);
}

/**
 * Push Notification Service Class
 */
class PushNotificationService {
  constructor() {
    this.activeSubscriptions = new Map();
    console.log('[PushService] Service initialized');
  }

  /**
   * Get platform-optimized payload
   */
  getPlatformOptimizedPayload(data, platform) {
    const basePayload = {
      title: data.title || 'GradeBook',
      body: data.body || 'New notification',
      icon: '/logo192.png',
      badge: '/badge-icon.png',
      url: data.url || '/app/notifications',
      notificationId: data.notificationId,
      timestamp: Date.now()
    };

    // Platform-specific optimizations
    if (platform?.isIOS) {
      return {
        ...basePayload,
        tag: `ios-${data.notificationId || Date.now()}`,
        urgent: data.urgent || false
      };
    }

    if (platform?.isAndroid) {
      return {
        ...basePayload,
        tag: `android-${data.notificationId || Date.now()}`,
        urgent: data.urgent || false,
        vibrate: data.urgent ? [200, 100, 200] : [100, 50, 100]
      };
    }

    // Desktop/Windows
    return {
      ...basePayload,
      tag: `desktop-${data.notificationId || Date.now()}`,
      urgent: data.urgent || false,
      vibrate: data.urgent ? [200, 100, 200] : [100, 50, 100]
    };
  }

  /**
   * Send push notification to subscription
   */
  async sendToSubscription(subscription, payload, options = {}) {
    try {
      console.log('[PushService] Sending push to:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        hasKeys: !!(subscription.keys?.p256dh && subscription.keys?.auth),
        platform: subscription.platform
      });

      const pushPayload = JSON.stringify(this.getPlatformOptimizedPayload(payload, subscription.platform));
      
      const pushOptions = {
        TTL: options.ttl || 86400, // 24 hours
        urgency: payload.urgent ? 'high' : 'normal',
        ...options
      };

      const result = await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }, pushPayload, pushOptions);

      console.log('[PushService] Push sent successfully:', {
        statusCode: result.statusCode,
        headers: result.headers
      });

      return {
        success: true,
        statusCode: result.statusCode,
        headers: result.headers
      };

    } catch (error) {
      console.error('[PushService] Push send failed:', {
        error: error.message,
        statusCode: error.statusCode,
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });

      // Handle subscription expiration/invalid subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('[PushService] Subscription expired/invalid, marking for removal');
        return {
          success: false,
          expired: true,
          statusCode: error.statusCode
        };
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode
      };
    }
  }

  /**
   * Send push to multiple subscriptions
   */
  async sendToMultipleSubscriptions(subscriptions, payload, options = {}) {
    console.log(`[PushService] Sending push to ${subscriptions.length} subscriptions`);
    
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        this.sendToSubscription(subscription, payload, options)
      )
    );

    const summary = {
      total: subscriptions.length,
      successful: 0,
      failed: 0,
      expired: 0,
      expiredSubscriptions: []
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          summary.successful++;
        } else {
          summary.failed++;
          if (result.value.expired) {
            summary.expired++;
            summary.expiredSubscriptions.push(subscriptions[index]);
          }
        }
      } else {
        summary.failed++;
      }
    });

    console.log('[PushService] Push batch completed:', summary);
    return summary;
  }
}

const pushService = new PushNotificationService();

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key  
// @access  Private
const getVapidPublicKey = asyncHandler(async (req, res) => {
  console.log('[PushController] VAPID public key request from user:', req.user._id);
  
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  console.log('[PushController] VAPID key check:', {
    hasKey: !!publicKey,
    keyLength: publicKey ? publicKey.length : 0,
    userId: req.user._id,
    userRole: req.user.role,
    vapidConfigured: vapidConfigured,
    keyFormat: publicKey ? (publicKey.startsWith('B') ? 'Valid Base64' : 'Invalid Format') : 'Missing'
  });
  
  if (!publicKey) {
    console.error('[PushController] VAPID_PUBLIC_KEY environment variable not set');
    return res.status(500).json({ 
      success: false,
      error: 'Push notifications not configured on server - missing VAPID_PUBLIC_KEY' 
    });
  }

  if (!vapidConfigured) {
    console.error('[PushController] VAPID keys not properly configured');
    return res.status(500).json({ 
      success: false,
      error: 'Push notifications not configured on server - VAPID keys invalid' 
    });
  }

  console.log('[PushController] Returning VAPID public key to client');
  res.status(200).json({ 
    success: true,
    vapidPublicKey: publicKey 
  });
});

// @desc    Create or update push subscription
// @route   POST /api/notifications/subscription
// @access  Private  
const createPushSubscription = asyncHandler(async (req, res) => {
  console.log('[PushController] Creating push subscription for user:', req.user._id);
  
  const { endpoint, keys, expirationTime, userAgent, platform } = req.body;
  
  // Validation
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    console.error('[PushController] Invalid subscription data:', {
      hasEndpoint: !!endpoint,
      hasKeys: !!keys,
      hasP256dh: !!(keys?.p256dh),
      hasAuth: !!(keys?.auth)
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid subscription data. Missing endpoint or keys.'
    });
  }

  try {
    // Check if subscription already exists
    let subscription = await PushSubscription.findOne({
      userId: req.user._id,
      endpoint: endpoint
    });

    if (subscription) {
      console.log('[PushController] Updating existing subscription');
      
      // Update existing subscription
      subscription.keys = keys;
      subscription.expirationTime = expirationTime;
      subscription.userAgent = userAgent;
      subscription.platform = platform;
      subscription.lastUpdated = new Date();
      
      await subscription.save();
    } else {
      console.log('[PushController] Creating new subscription');
      
      // Create new subscription
      subscription = new PushSubscription({
        userId: req.user._id,
        schoolId: req.user.schoolId,
        endpoint: endpoint,
        keys: keys,
        expirationTime: expirationTime,
        userAgent: userAgent,
        platform: platform,
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
      
      await subscription.save();
    }

    console.log('[PushController] Subscription saved:', {
      subscriptionId: subscription._id,
      userId: req.user._id,
      platform: platform,
      endpoint: endpoint.substring(0, 50) + '...'
    });

    res.status(200).json({
      success: true,
      message: 'Push subscription saved successfully',
      subscriptionId: subscription._id
    });

  } catch (error) {
    console.error('[PushController] Error saving subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save push subscription'
    });
  }
});

// @desc    Delete push subscription
// @route   DELETE /api/notifications/subscription
// @access  Private
const deletePushSubscription = asyncHandler(async (req, res) => {
  console.log('[PushController] Deleting push subscription for user:', req.user._id);
  
  const { endpoint } = req.body;
  
  if (!endpoint) {
    return res.status(400).json({
      success: false,
      error: 'Endpoint is required'
    });
  }

  try {
    const result = await PushSubscription.deleteOne({
      userId: req.user._id,
      endpoint: endpoint
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    console.log('[PushController] Subscription deleted successfully');
    
    res.status(200).json({
      success: true,
      message: 'Push subscription deleted successfully'
    });

  } catch (error) {
    console.error('[PushController] Error deleting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete push subscription'
    });
  }
});

// @desc    Send test push notification
// @route   POST /api/notifications/test
// @access  Private
const sendTestPush = asyncHandler(async (req, res) => {
  console.log('[PushController] Test push notification request from user:', req.user._id);
  
  const { title, body, platform } = req.body;

  try {
    // Get user's subscriptions
    const subscriptions = await PushSubscription.find({
      userId: req.user._id,
      isActive: true
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active push subscriptions found'
      });
    }

    console.log(`[PushController] Found ${subscriptions.length} active subscriptions for test`);

    // Prepare test payload
    const testPayload = {
      title: title || 'Test Notification',
      body: body || `Test push notification from GradeBook at ${new Date().toLocaleTimeString()}`,
      url: '/app/notifications',
      notificationId: `test-${Date.now()}`,
      urgent: false
    };

    // Send to all user subscriptions
    const results = await pushService.sendToMultipleSubscriptions(
      subscriptions,
      testPayload,
      { ttl: 300 } // 5 minutes TTL for test notifications
    );

    // Clean up expired subscriptions
    if (results.expiredSubscriptions.length > 0) {
      await PushSubscription.deleteMany({
        endpoint: { $in: results.expiredSubscriptions.map(sub => sub.endpoint) }
      });
      console.log(`[PushController] Cleaned up ${results.expiredSubscriptions.length} expired subscriptions`);
    }

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
      results: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        expired: results.expired
      }
    });

  } catch (error) {
    console.error('[PushController] Error sending test push:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// @desc    Get user's push subscriptions
// @route   GET /api/notifications/subscriptions
// @access  Private
const getUserSubscriptions = asyncHandler(async (req, res) => {
  console.log('[PushController] Getting subscriptions for user:', req.user._id);

  try {
    const subscriptions = await PushSubscription.find({
      userId: req.user._id,
      isActive: true
    }).select('-keys'); // Don't send keys to client

    console.log(`[PushController] Found ${subscriptions.length} active subscriptions`);

    const subscriptionInfo = subscriptions.map(sub => ({
      id: sub._id,
      endpoint: sub.endpoint.substring(0, 50) + '...',
      platform: sub.platform,
      userAgent: sub.userAgent,
      createdAt: sub.createdAt,
      lastUpdated: sub.lastUpdated,
      expirationTime: sub.expirationTime
    }));

    res.status(200).json({
      success: true,
      subscriptions: subscriptionInfo,
      count: subscriptions.length
    });

  } catch (error) {
    console.error('[PushController] Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get push subscriptions'
    });
  }
});

module.exports = {
  getVapidPublicKey,
  createPushSubscription,
  deletePushSubscription,
  sendTestPush,
  getUserSubscriptions,
  pushService
};
