/**
 * Modern PWA Push Notification Service Worker
 * Cross-platform compatible (iOS, Android, Windows)
 * Follows 2024 PWA standards and best practices
 */

const SW_VERSION = '1.0.0';
const SW_NAME = 'push-notification-sw';

console.log(`[${SW_NAME}] Service Worker ${SW_VERSION} loaded`);

/**
 * Platform Detection Utilities
 */
class PlatformDetector {
  static detect() {
    const userAgent = self.navigator?.userAgent || '';
    return {
      isIOS: /iPad|iPhone|iPod/.test(userAgent) || (self.navigator?.platform === 'MacIntel' && self.navigator?.maxTouchPoints > 1),
      isAndroid: /Android/.test(userAgent),
      isWindows: /Windows/.test(userAgent),
      isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
      isChrome: /Chrome/.test(userAgent),
      isFirefox: /Firefox/.test(userAgent),
      userAgent
    };
  }

  static getOptimalNotificationOptions(platform, data) {
    const baseOptions = {
      body: data.body || 'New notification',
      icon: '/logo192.png',
      badge: '/badge-icon.png',
      tag: data.tag || `notification-${Date.now()}`,
      data: {
        url: data.url || '/app/notifications',
        notificationId: data.notificationId,
        timestamp: Date.now(),
        platform: platform
      },
      timestamp: Date.now()
    };

    // Platform-specific optimizations
    if (platform.isIOS) {
      // iOS Safari has limited notification support
      return {
        ...baseOptions,
        // Remove features not well supported on iOS
        silent: false,
        requireInteraction: false,
        // Keep it simple for iOS
        vibrate: []
      };
    }

    if (platform.isAndroid) {
      // Android supports more features
      return {
        ...baseOptions,
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/icons/view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss.png'
          }
        ],
        vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
        requireInteraction: !!data.urgent,
        silent: false
      };
    }

    // Windows/Desktop - full feature support
    return {
      ...baseOptions,
      actions: [
        {
          action: 'view',
          title: 'View Notification',
          icon: '/icons/view.png'
        },
        {
          action: 'mark-read',
          title: 'Mark as Read',
          icon: '/icons/check.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ],
      vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
      requireInteraction: !!data.urgent,
      silent: false,
      renotify: false // Avoid notification spam
    };
  }
}

/**
 * Notification Handler Class
 */
class NotificationHandler {
  constructor() {
    this.platform = PlatformDetector.detect();
    console.log(`[${SW_NAME}] Initialized for platform:`, this.platform);
  }

  /**
   * Handle incoming push event
   */
  async handlePushEvent(event) {
    console.log(`[${SW_NAME}] Push event received:`, {
      hasData: !!event.data,
      timestamp: new Date().toISOString(),
      platform: this.platform
    });

    try {
      let notificationData = this._getDefaultNotificationData();

      // Parse push data if available
      if (event.data) {
        try {
          const pushData = event.data.json();
          notificationData = { ...notificationData, ...pushData };
          console.log(`[${SW_NAME}] Parsed push data:`, notificationData);
        } catch (parseError) {
          console.error(`[${SW_NAME}] Failed to parse push data:`, parseError);
          // Use text content as fallback
          try {
            const textData = event.data.text();
            notificationData.body = textData || notificationData.body;
          } catch (textError) {
            console.error(`[${SW_NAME}] Failed to parse as text:`, textError);
          }
        }
      }

      // CRITICAL: Check if notification is intended for current user
      const currentUserId = await this._getCurrentUserId();
      const targetUserId = notificationData.data?.targetUserId;
      
      console.log(`[${SW_NAME}] SECURITY CHECK - Current User: ${currentUserId} | Target User: ${targetUserId}`);
      
      if (targetUserId && currentUserId && targetUserId !== currentUserId) {
        console.log(`[${SW_NAME}] 🛡️ SECURITY: Notification not for current user - BLOCKED`);
        return; // Don't show notification not intended for this user
      }
      
      // CRITICAL: Check user receiving preference before showing notification
      const shouldReceiveNotifications = await this._checkUserReceivingPreference();
      
      if (!shouldReceiveNotifications) {
        console.log(`[${SW_NAME}] User has disabled receiving notifications - service active but not showing notification`);
        return; // Service stays active but doesn't show notification
      }

      console.log(`[${SW_NAME}] ✅ SECURITY PASSED - Showing notification for user: ${currentUserId}`);
      // Show notification
      await this._showNotification(notificationData);

    } catch (error) {
      console.error(`[${SW_NAME}] Error handling push event:`, error);
      // Show fallback notification
      await this._showFallbackNotification();
    }
  }

  /**
   * Get current user ID from storage for security filtering
   */
  async _getCurrentUserId() {
    try {
      // Try to get from various storage locations
      let userId = null;
      
      // Try localStorage first
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT token to get user ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id;
          console.log(`[${SW_NAME}] Current user ID from token: ${userId}`);
        } catch (tokenError) {
          console.error(`[${SW_NAME}] Error decoding token:`, tokenError);
        }
      }
      
      // Fallback to stored user data
      if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userId = user._id || user.id;
            console.log(`[${SW_NAME}] Current user ID from user data: ${userId}`);
          } catch (userError) {
            console.error(`[${SW_NAME}] Error parsing user data:`, userError);
          }
        }
      }
      
      return userId;
      
    } catch (error) {
      console.error(`[${SW_NAME}] Error getting current user ID:`, error);
      return null;
    }
  }

  /**
   * Check if user wants to receive notifications (preference only)
   */
  async _checkUserReceivingPreference() {
    try {
      // Get user preference from IndexedDB or localStorage
      const userPreference = localStorage.getItem('pushNotificationEnabled');
      
      // Default to true if not set (user hasn't disabled)
      if (userPreference === null) {
        console.log(`[${SW_NAME}] No preference set, defaulting to receive notifications`);
        return true;
      }
      
      const shouldReceive = userPreference === 'true';
      console.log(`[${SW_NAME}] User receiving preference:`, shouldReceive);
      return shouldReceive;
      
    } catch (error) {
      console.error(`[${SW_NAME}] Error checking user preference, defaulting to show:`, error);
      return true; // Default to showing on error
    }
  }

  /**
   * Show notification with platform-optimized options
   */
  async _showNotification(data) {
    try {
      const title = data.title || 'GradeBook';
      const options = PlatformDetector.getOptimalNotificationOptions(this.platform, data);

      console.log(`[${SW_NAME}] Showing notification:`, {
        title,
        platform: this.platform.isIOS ? 'iOS' : this.platform.isAndroid ? 'Android' : 'Desktop',
        hasActions: !!options.actions?.length,
        optionsKeys: Object.keys(options)
      });

      // Show the notification
      await self.registration.showNotification(title, options);

      // Verify notification was created (debugging)
      setTimeout(async () => {
        try {
          const notifications = await self.registration.getNotifications();
          console.log(`[${SW_NAME}] Active notifications after show:`, {
            count: notifications.length,
            titles: notifications.map(n => n.title)
          });
        } catch (verifyError) {
          console.error(`[${SW_NAME}] Failed to verify notifications:`, verifyError);
        }
      }, 100);

    } catch (error) {
      console.error(`[${SW_NAME}] Failed to show notification:`, error);
      throw error;
    }
  }

  /**
   * Show fallback notification when main notification fails
   */
  async _showFallbackNotification() {
    try {
      console.log(`[${SW_NAME}] Showing fallback notification`);
      
      await self.registration.showNotification('GradeBook', {
        body: 'You have a new notification',
        icon: '/logo192.png',
        badge: '/badge-icon.png',
        tag: `fallback-${Date.now()}`,
        data: {
          url: '/app/notifications',
          isFallback: true
        }
      });
    } catch (fallbackError) {
      console.error(`[${SW_NAME}] Even fallback notification failed:`, fallbackError);
    }
  }

  /**
   * Get default notification data
   */
  _getDefaultNotificationData() {
    return {
      title: 'GradeBook',
      body: 'You have a new notification',
      url: '/app/notifications',
      urgent: false
    };
  }

  /**
   * Handle notification click events
   */
  async handleNotificationClick(event) {
    console.log(`[${SW_NAME}] Notification click:`, {
      action: event.action,
      tag: event.notification.tag,
      platform: this.platform
    });

    // Close the notification
    event.notification.close();

    // Get notification data
    const notificationData = event.notification.data || {};
    let targetUrl = notificationData.url || '/app/notifications';

    // Handle different actions
    switch (event.action) {
      case 'view':
        targetUrl = notificationData.url || '/app/notifications';
        break;
      case 'mark-read':
        await this._markNotificationAsRead(notificationData.notificationId);
        return; // Don't open window for mark-read action
      case 'dismiss':
        return; // Just close notification, don't open window
      default:
        // Default click (no action button)
        targetUrl = notificationData.url || '/app/notifications';
    }

    // Focus or open window
    await this._focusOrOpenWindow(targetUrl);
  }

  /**
   * Mark notification as read via API
   */
  async _markNotificationAsRead(notificationId) {
    if (!notificationId) return;

    try {
      // This would need proper authentication in real implementation
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`[${SW_NAME}] Marked notification as read:`, notificationId);
      }
    } catch (error) {
      console.error(`[${SW_NAME}] Failed to mark notification as read:`, error);
    }
  }

  /**
   * Focus existing window or open new one
   */
  async _focusOrOpenWindow(url) {
    try {
      // Get all client windows
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Try to find and focus existing window
      for (const client of clients) {
        if (client.url && new URL(client.url).origin === self.location.origin) {
          console.log(`[${SW_NAME}] Focusing existing window:`, client.url);
          await client.focus();
          
          // Navigate to target URL if supported
          if (client.navigate && url !== client.url) {
            await client.navigate(url);
          }
          return;
        }
      }

      // No existing window found, open new one
      console.log(`[${SW_NAME}] Opening new window:`, url);
      await self.clients.openWindow(url);

    } catch (error) {
      console.error(`[${SW_NAME}] Failed to focus/open window:`, error);
      // Fallback: try to open notifications page
      try {
        await self.clients.openWindow('/app/notifications');
      } catch (fallbackError) {
        console.error(`[${SW_NAME}] Fallback window open failed:`, fallbackError);
      }
    }
  }
}

// Initialize notification handler
const notificationHandler = new NotificationHandler();

/**
 * Service Worker Event Listeners
 */

// Push event listener
self.addEventListener('push', (event) => {
  console.log(`[${SW_NAME}] Push event received at:`, new Date().toISOString());
  
  event.waitUntil(
    notificationHandler.handlePushEvent(event)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  console.log(`[${SW_NAME}] Notification click event:`, event.action);
  
  event.waitUntil(
    notificationHandler.handleNotificationClick(event)
  );
});

// Push subscription change event listener
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log(`[${SW_NAME}] Push subscription changed`);
  
  event.waitUntil(
    (async () => {
      try {
        // Get new subscription
        const newSubscription = event.newSubscription || 
          await self.registration.pushManager.getSubscription();

        if (newSubscription) {
          console.log(`[${SW_NAME}] Updating subscription on server`);
          
          // Send new subscription to server
          const response = await fetch('/api/notifications/subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              endpoint: newSubscription.endpoint,
              expirationTime: newSubscription.expirationTime,
              keys: newSubscription.keys,
              userAgent: self.navigator.userAgent,
              platform: notificationHandler.platform
            })
          });

          if (response.ok) {
            console.log(`[${SW_NAME}] Subscription updated on server`);
          } else {
            console.error(`[${SW_NAME}] Failed to update subscription on server:`, response.status);
          }
        }
      } catch (error) {
        console.error(`[${SW_NAME}] Error handling subscription change:`, error);
      }
    })()
  );
});

// Service worker install event
self.addEventListener('install', (event) => {
  console.log(`[${SW_NAME}] Installing version ${SW_VERSION}`);
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log(`[${SW_NAME}] Activating version ${SW_VERSION}`);
  
  event.waitUntil(
    (async () => {
      // Take control of all pages immediately
      await self.clients.claim();
      
      // Clean up old caches if any
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('push-notifications-'))
          .filter(cacheName => cacheName !== `push-notifications-${SW_VERSION}`)
          .map(cacheName => caches.delete(cacheName))
      );
      
      console.log(`[${SW_NAME}] Service worker activated and ready`);
    })()
  );
});

// Error event listener
self.addEventListener('error', (event) => {
  console.error(`[${SW_NAME}] Service worker error:`, event.error);
});

// Unhandled rejection listener
self.addEventListener('unhandledrejection', (event) => {
  console.error(`[${SW_NAME}] Unhandled promise rejection:`, event.reason);
});

console.log(`[${SW_NAME}] Service worker setup complete`);
