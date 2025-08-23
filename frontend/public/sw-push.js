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
        console.log(`[${SW_NAME}] 📋 Parsing push event data...`);
        try {
          notificationData = event.data.json();
          console.log(`[${SW_NAME}] 📋 RAW PUSH DATA:`, JSON.stringify(notificationData, null, 2));
        } catch (parseError) {
          console.error(`[${SW_NAME}] Error parsing push data:`, parseError);
        }
      }
      
      // SECURITY: Check if notification is intended for current user
      console.log(`[${SW_NAME}] 🔐 STARTING USER ID SECURITY CHECK...`);
      const currentUserId = await this._getCurrentUserId();
      const targetUserId = notificationData.data?.targetUserId;
      
      console.log(`[${SW_NAME}] 🔐 SECURITY CHECK RESULTS:`);
      console.log(`[${SW_NAME}] - Current user ID: ${currentUserId}`);
      console.log(`[${SW_NAME}] - Target user ID: ${targetUserId}`);
      console.log(`[${SW_NAME}] - User ID match: ${currentUserId === targetUserId}`);
      
      if (targetUserId && currentUserId && targetUserId !== currentUserId) {
        console.log(`[${SW_NAME}] 🛡️ SECURITY: Blocking notification not intended for current user`);
        console.log(`[${SW_NAME}] 🛡️ Expected: ${targetUserId}, Got: ${currentUserId}`);
        return; // Don't show notification not intended for this user
      }
      
      console.log(`[${SW_NAME}] ✅ SECURITY CHECK PASSED - Notification is for current user`);
      
      // Check if user wants to receive notifications (preference only)
      console.log(`[${SW_NAME}] 📋 Checking user receiving preference...`);
      const userWantsNotifications = await this._checkUserReceivingPreference();
      console.log(`[${SW_NAME}] 📋 User wants notifications: ${userWantsNotifications}`);
      
      if (!userWantsNotifications) {
        console.log(`[${SW_NAME}] 📵 User disabled notification receiving - not showing notification`);
        return;
      }
      
      console.log(`[${SW_NAME}] ✅ ALL CHECKS PASSED - Proceeding to show notification`);
      console.log(`[${SW_NAME}] 🔔 Calling _showNotification with data:`, notificationData);
      
      await this._showNotification(notificationData);
      
      console.log(`[${SW_NAME}] ✅ PUSH EVENT HANDLING COMPLETED SUCCESSFULLY`);

    } catch (error) {
      console.error(`[${SW_NAME}] ❌ ERROR IN PUSH EVENT HANDLER:`, error);
      console.error(`[${SW_NAME}] ❌ Error stack:`, error.stack);
      // Show fallback notification
      console.log(`[${SW_NAME}] 🔄 Showing fallback notification due to error`);
      await this._showFallbackNotification();
    }
  }

  /**
   * Get current user ID from IndexedDB for security filtering
   * Service workers cannot access localStorage directly
   */
  async _getCurrentUserId() {
    try {
      console.log(`[${SW_NAME}] Getting current user ID from IndexedDB...`);
      
      // Open IndexedDB connection
      const dbRequest = indexedDB.open('GradeBookApp', 1);
      
      return new Promise((resolve, reject) => {
        dbRequest.onerror = () => {
          console.error(`[${SW_NAME}] IndexedDB error:`, dbRequest.error);
          resolve(null);
        };
        
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          
          try {
            const transaction = db.transaction(['userAuth'], 'readonly');
            const store = transaction.objectStore('userAuth');
            const request = store.get('currentUser');
            
            request.onsuccess = () => {
              const result = request.result;
              if (result && result.userId) {
                console.log(`[${SW_NAME}] Current user ID from IndexedDB: ${result.userId}`);
                resolve(result.userId);
              } else {
                console.log(`[${SW_NAME}] No user ID found in IndexedDB`);
                resolve(null);
              }
            };
            
            request.onerror = () => {
              console.error(`[${SW_NAME}] Error reading from IndexedDB:`, request.error);
              resolve(null);
            };
            
          } catch (storeError) {
            console.error(`[${SW_NAME}] IndexedDB store error:`, storeError);
            resolve(null);
          }
        };
        
        dbRequest.onupgradeneeded = () => {
          console.log(`[${SW_NAME}] IndexedDB needs upgrade - creating stores`);
          const db = dbRequest.result;
          
          if (!db.objectStoreNames.contains('userAuth')) {
            db.createObjectStore('userAuth');
          }
          
          // Continue to success handler
        };
      });
      
    } catch (error) {
      console.error(`[${SW_NAME}] Error accessing IndexedDB:`, error);
      return null;
    }
  }

  /**
   * Check if user wants to receive notifications (preference only)
   * FIXED: Service workers cannot access localStorage directly
   */
  async _checkUserReceivingPreference() {
    try {
      console.log(`[${SW_NAME}] Checking user receiving preference from IndexedDB...`);
      
      // Get user preference from IndexedDB (service workers cannot access localStorage)
      const dbRequest = indexedDB.open('GradeBookApp', 2);
      
      return new Promise((resolve) => {
        dbRequest.onerror = () => {
          console.error(`[${SW_NAME}] IndexedDB error for preference check:`, dbRequest.error);
          console.log(`[${SW_NAME}] Defaulting to show notifications due to error`);
          resolve(true); // Default to showing on error
        };
        
        dbRequest.onsuccess = () => {
          const db = dbRequest.result;
          
          try {
            const transaction = db.transaction(['userPreferences'], 'readonly');
            const store = transaction.objectStore('userPreferences');
            const request = store.get('pushNotificationEnabled');
            
            request.onsuccess = () => {
              const result = request.result;
              let shouldReceive = true; // Default to true
              
              if (result && typeof result.value !== 'undefined') {
                shouldReceive = result.value === true || result.value === 'true';
                console.log(`[${SW_NAME}] User preference from IndexedDB:`, shouldReceive);
              } else {
                console.log(`[${SW_NAME}] No preference set in IndexedDB, defaulting to receive notifications`);
              }
              
              resolve(shouldReceive);
            };
            
            request.onerror = () => {
              console.error(`[${SW_NAME}] Error reading preference from IndexedDB:`, request.error);
              console.log(`[${SW_NAME}] Defaulting to show notifications due to read error`);
              resolve(true); // Default to showing on error
            };
            
          } catch (storeError) {
            console.error(`[${SW_NAME}] IndexedDB store error for preferences:`, storeError);
            console.log(`[${SW_NAME}] Defaulting to show notifications due to store error`);
            resolve(true); // Default to showing on error
          }
        };
        
        dbRequest.onupgradeneeded = () => {
          console.log(`[${SW_NAME}] Creating IndexedDB stores for preferences`);
          const db = dbRequest.result;
          
          // Create userPreferences store if it doesn't exist
          if (!db.objectStoreNames.contains('userPreferences')) {
            db.createObjectStore('userPreferences');
          }
          
          // Create userAuth store if it doesn't exist (from existing code)
          if (!db.objectStoreNames.contains('userAuth')) {
            db.createObjectStore('userAuth');
          }
        };
      });
      
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
