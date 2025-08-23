import axiosInstance from '../app/axios';
import { store } from '../app/store';
import { API_URL } from '../config/appConfig';
import { subscribeToPushNotifications, getVapidPublicKey } from '../features/notifications/notificationSlice';

/**
 * Enhanced Base64 to Uint8Array conversion for VAPID keys
 * Special handling for Android devices which are more sensitive to format
 * @param {string} base64String - The base64 encoded VAPID public key
 * @returns {Uint8Array} - The converted application server key
 */
const convertBase64ToUint8Array = (base64String) => {
  try {
    // Input validation
    if (!base64String) {
      console.error('Empty VAPID key provided');
      throw new Error('VAPID key cannot be empty');
    }

    // Normalize the base64 string
    const base64 = String(base64String).trim();
    
    // Add padding if needed (important for correct decoding)
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    
    // Convert web-safe base64 to standard base64
    const base64Standardized = (base64 + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Convert to raw binary data 
    const rawData = window.atob(base64Standardized);
    
    // Create the output Uint8Array with exact length
    const outputArray = new Uint8Array(rawData.length);

    // Fill the array with byte values
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // Validate the output array (Android requires proper length)
    if (outputArray.length < 8) {
      console.error('VAPID key conversion produced too short result:', outputArray.length);
      throw new Error('VAPID key conversion failed: result too short');
    }
    
    console.log('Successfully converted VAPID key to Uint8Array of length:', outputArray.length);
    return outputArray;
  } catch (error) {
    console.error('Error converting base64 to Uint8Array:', error);
    throw new Error('Failed to process VAPID key: ' + error.message);
  }
};

/**
 * Sets up push notifications with enhanced Android support
 * @returns {Promise<PushSubscription>} The created subscription object
 */
export const setupPushNotifications = async () => {
  try {
    // 1. Check browser support
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser');
    }
    
    if (!('PushManager' in window)) {
      throw new Error('Push notifications are not supported in this browser');
    }
    
    console.log('Push notification prerequisites check passed');
    
    // 2. Ensure push service worker is registered and active
    let registration;
    try {
      // Specifically register the push notification service worker
      registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      
      // Wait for the service worker to be activated
      if (registration.installing) {
        console.log('Push service worker installing...');
        const worker = registration.installing;
        
        await new Promise((resolve) => {
          worker.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              console.log('Push service worker has been activated');
              resolve();
            }
          });
        });
      } else if (registration.waiting) {
        console.log('Push service worker is waiting');
        registration.waiting.postMessage({type: 'SKIP_WAITING'});
      } else {
        console.log('Push service worker is active');
      }
      
      await registration.update().catch(e => {
        console.log('Push service worker update failed, continuing with existing worker:', e);
      });
      
      console.log('Push service worker is ready for subscription');
    } catch (swError) {
      console.error('Error preparing push service worker:', swError);
      throw new Error('Failed to initialize push service worker: ' + swError.message);
    }
    
    // 3. Check for existing subscription
    try {
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        try {
          const endpoint = existingSubscription.endpoint;
          const keys = existingSubscription.options?.applicationServerKey || 
                      existingSubscription.getKey?.('p256dh');
          
          if (endpoint && keys) {
            console.log('Valid push subscription exists, reusing it');
            
            try {
              await store.dispatch(subscribeToPushNotifications(existingSubscription));
              console.log('Existing subscription refreshed on server');
            } catch (refreshError) {
              console.warn('Could not refresh subscription on server, but will still use it:', refreshError);
            }
            
            return existingSubscription;
          }
        } catch (validationError) {
          console.warn('Existing subscription is invalid, will create new one:', validationError);
        }
        
        try {
          await existingSubscription.unsubscribe();
          console.log('Successfully unsubscribed from invalid subscription');
        } catch (unsubError) {
          console.warn('Could not unsubscribe from existing subscription:', unsubError);
        }
      }
    } catch (subCheckError) {
      console.warn('Error checking existing subscription:', subCheckError);
    }
    
    // 4. Get VAPID key from server
    let applicationServerKey;
    try {
      const vapidResponse = await store.dispatch(getVapidPublicKey());
      
      if (vapidResponse.error) {
        throw new Error(vapidResponse.error.message || 'Server returned an error');
      }
      
      if (!vapidResponse.payload?.vapidPublicKey) {
        throw new Error('Server returned empty VAPID key');
      }
      
      applicationServerKey = convertBase64ToUint8Array(vapidResponse.payload.vapidPublicKey);
      console.log('VAPID key successfully retrieved and converted');
    } catch (keyError) {
      console.error('Failed to get or process VAPID key:', keyError);
      throw new Error('Could not prepare push notification key: ' + keyError.message);
    }
    
    // 5. Create push subscription
    try {
      console.log('Requesting push notification permission...');
      
      const subscription = await Promise.race([
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Push subscription timed out after 30s')), 30000)
        )
      ]);
      
      if (!subscription) {
        throw new Error('Subscription creation failed - received empty subscription');
      }
      
      console.log('Push subscription successfully created:', 
        subscription.endpoint ? subscription.endpoint.substr(0, 50) + '...' : 'No endpoint');
      
      // 6. Register the subscription with the server
      try {
        await store.dispatch(subscribeToPushNotifications(subscription));
        console.log('Subscription saved on server');
      } catch (serverError) {
        console.error('Failed to save subscription on server:', serverError);
      }
      
      return subscription;
    } catch (subscribeError) {
      console.error('Failed to create push subscription:', subscribeError);
      
      if (subscribeError.name === 'NotAllowedError') {
        throw new Error('Push notification permission was denied by the user');
      } else if (subscribeError.name === 'AbortError') {
        throw new Error('Push notification request was aborted');
      } else {
        throw new Error('Failed to subscribe to push notifications: ' + subscribeError.message);
      }
    }
  } catch (error) {
    console.error('Push notification setup failed:', error);
    
    let userMessage = 'Could not enable notifications';
    if (error.message) {
      userMessage += ': ' + error.message;
    }
    
    throw new Error(userMessage);
  }
};

export const unsubscribeFromPushNotifications = async () => {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        const endpoint = subscription.endpoint;
        console.log('Unsubscribing from push notifications');
        console.log('Using API_URL for secure push notification unsubscribe:', API_URL);
        await axiosInstance.post(`${API_URL}/api/subscriptions/delete`, { endpoint });
        
        console.log('Successfully unsubscribed from push notifications');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

/**
 * Enhanced Push Notification Manager
 * Based on proven working implementation
 */
class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isInitialized = false;
    
    console.log('[PushManager] Initialized');
  }

  /**
   * Public method to check if push notifications are supported
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Public method to get platform detection info
   */
  detectPlatform() {
    const ua = navigator.userAgent;
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      isAndroid: /Android/.test(ua),
      isWindows: /Windows/.test(ua),
      isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
      isChrome: /Chrome/.test(ua),
      isFirefox: /Firefox/.test(ua)
    };
  }

  /**
   * Check if in PWA mode
   */
  isPWAMode() {
    return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Initialize service worker
   */
  async initializeServiceWorker() {
    try {
      await setupPushNotifications();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus() {
    return Notification?.permission || 'default';
  }

  /**
   * Check if currently subscribed
   */
  async isSubscribed() {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  /**
   * CRITICAL: Initialize ALWAYS-ACTIVE push service (tied to user ID)
   * This service runs regardless of user preference toggle
   * User preference only controls RECEIVING, not service subscription
   */
  async initializeAlwaysActivePushService() {
    console.log('[PushManager] INITIALIZING ALWAYS-ACTIVE PUSH SERVICE (tied to user ID)...');
    try {
      // Store user ID in IndexedDB for service worker access
      await this._storeUserIdForServiceWorker();
      
      await setupPushNotifications();
      console.log('[PushManager] ✅ ALWAYS-ACTIVE PUSH SERVICE INITIALIZED - User can now receive targeted notifications');
      return { success: true };
    } catch (error) {
      console.error('[PushManager] Always-active service failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store current user ID and preferences in IndexedDB for service worker filtering
   * ENHANCED: Now also stores push notification preferences for service worker access
   */
  async _storeUserIdForServiceWorker() {
    try {
      console.log('[PushManager] Storing user ID and preferences in IndexedDB for service worker...');
      
      // Get current user ID from auth state
      const token = localStorage.getItem('token');
      let userId = null;
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id;
        } catch (e) {
          console.error('[PushManager] Error decoding token:', e);
        }
      }
      
      if (!userId) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userId = user._id || user.id;
          } catch (e) {
            console.error('[PushManager] Error parsing user data:', e);
          }
        }
      }
      
      // Get push notification preference from localStorage
      const pushEnabled = localStorage.getItem('pushNotificationEnabled');
      const pushPreference = pushEnabled === null ? true : pushEnabled === 'true';
      
      console.log('[PushManager] Current push notification preference:', pushPreference);
      
      if (!userId) {
        console.error('[PushManager] No user ID found to store');
        return;
      }
      
      // Store in IndexedDB
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('GradeBookApp', 1);
        
        request.onerror = () => {
          console.error('[PushManager] IndexedDB error:', request.error);
          resolve(); // Don't fail the whole process
        };
        
        request.onsuccess = () => {
          const db = request.result;
          try {
            const transaction = db.transaction(['userAuth', 'userPreferences'], 'readwrite');
            
            // Store user ID
            const authStore = transaction.objectStore('userAuth');
            authStore.put({ userId: userId, timestamp: Date.now() }, 'currentUser');
            
            // Store push notification preference
            const prefStore = transaction.objectStore('userPreferences');
            prefStore.put({ value: pushPreference, timestamp: Date.now() }, 'pushNotificationEnabled');
            
            transaction.oncomplete = () => {
              console.log(`[PushManager] ✅ Stored user ID ${userId} and push preference ${pushPreference} in IndexedDB`);
              resolve();
            };
            
            transaction.onerror = () => {
              console.error('[PushManager] Transaction error:', transaction.error);
              resolve(); // Don't fail the whole process
            };
          } catch (e) {
            console.error('[PushManager] Store error:', e);
            resolve(); // Don't fail the whole process
          }
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create userAuth store if it doesn't exist
          if (!db.objectStoreNames.contains('userAuth')) {
            console.log('[IndexedDB] Creating userAuth object store');
            db.createObjectStore('userAuth');
          }
          
          // Create userPreferences store if it doesn't exist
          if (!db.objectStoreNames.contains('userPreferences')) {
            console.log('[IndexedDB] Creating userPreferences object store');
            db.createObjectStore('userPreferences');
          }
        };
      });
      
    } catch (error) {
      console.error('[PushManager] Error storing user data:', error);
      // Don't fail the whole process
    }
  }

  /**
   * Update push notification preference in both localStorage and IndexedDB
   * CRITICAL: This ensures service worker can access the latest preference
   */
  async updatePushNotificationPreference(enabled) {
    try {
      console.log(`[PushManager] Updating push notification preference to: ${enabled}`);
      
      // Update localStorage (for immediate access)
      localStorage.setItem('pushNotificationEnabled', enabled.toString());
      
      // Update IndexedDB (for service worker access)
      return new Promise((resolve) => {
        const request = indexedDB.open('GradeBookApp', 1);
        
        request.onerror = () => {
          console.error('[PushManager] IndexedDB error updating preference:', request.error);
          resolve(); // Don't fail
        };
        
        request.onsuccess = () => {
          const db = request.result;
          try {
            const transaction = db.transaction(['userPreferences'], 'readwrite');
            const store = transaction.objectStore('userPreferences');
            
            store.put({ value: enabled, timestamp: Date.now() }, 'pushNotificationEnabled');
            
            transaction.oncomplete = () => {
              console.log(`[PushManager] ✅ Updated push preference to ${enabled} in IndexedDB`);
              resolve();
            };
            
            transaction.onerror = () => {
              console.error('[PushManager] Transaction error updating preference:', transaction.error);
              resolve(); // Don't fail
            };
          } catch (e) {
            console.error('[PushManager] Store error updating preference:', e);
            resolve(); // Don't fail
          }
        };
        
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('userPreferences')) {
            db.createObjectStore('userPreferences');
          }
        };
      });
      
    } catch (error) {
      console.error('[PushManager] Error updating push preference:', error);
    }
  }

  /**
   * DEPRECATED: Old method that tied service to user preference
   * Now redirects to always-active service
   */
  async enablePushNotifications() {
    console.log('[PushManager] DEPRECATED: Redirecting to always-active service...');
    return await this.initializeAlwaysActivePushService();
  }

  /**
   * Disable push notifications (unsubscribe)
   */
  async disablePushNotifications() {
    try {
      await unsubscribeFromPushNotifications();
      return { success: true };
    } catch (error) {
      console.error('[PushManager] Disable failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(payload = {}) {
    try {
      console.log('[PushManager] Sending test notification...');
      
      const token = this._getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: payload.title || 'Test Notification',
          body: payload.body || 'This is a test push notification',
          platform: this.detectPlatform()
        })
      });

      if (!response.ok) {
        throw new Error(`Test notification failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[PushManager] Test notification sent');
      return { success: true, results: result };
      
    } catch (error) {
      console.error('[PushManager] Test notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has active push subscription
   */
  async hasActiveSubscription() {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration || !registration.pushManager) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('[PushManager] Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Disable push notifications (unsubscribe)
   */
  async disablePushNotifications() {
    try {
      console.log('[PushManager] Disabling push notifications...');
      
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration || !registration.pushManager) {
        console.log('[PushManager] No service worker registration found');
        return { success: true, message: 'No subscription to remove' };
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('[PushManager] Unsubscribing from push notifications');
        await subscription.unsubscribe();
        console.log('[PushManager] Successfully unsubscribed from push notifications');
      }

      return { success: true, message: 'Push notifications disabled' };
    } catch (error) {
      console.error('[PushManager] Error disabling push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear existing subscription to force fresh permission prompt
   */
  async clearExistingSubscription() {
    try {
      console.log('[PushManager] Clearing existing subscription to trigger fresh permission...');
      
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration || !registration.pushManager) {
        console.log('[PushManager] No service worker registration found');
        return { success: true };
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        console.log('[PushManager] Clearing existing subscription');
        await subscription.unsubscribe();
        console.log('[PushManager] Existing subscription cleared - fresh permission prompt will be shown');
      } else {
        console.log('[PushManager] No existing subscription found');
      }

      return { success: true };
    } catch (error) {
      console.error('[PushManager] Error clearing existing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get auth token from localStorage
   */
  _getAuthToken() {
    return localStorage.getItem('token');
  }
}

// Export the manager class as default
export default PushNotificationManager;
