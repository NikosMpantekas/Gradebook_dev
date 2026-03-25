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
      registration = await navigator.serviceWorker.register('/push-service-worker.js', {
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
   * Enable push notifications (subscribe)
   */
  async enablePushNotifications() {
    try {
      await setupPushNotifications();
      return { success: true };
    } catch (error) {
      console.error('[PushManager] Enable failed:', error);
      return { success: false, error: error.message };
    }
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
   * Get auth token from localStorage
   */
  _getAuthToken() {
    return localStorage.getItem('token');
  }
}

// Export the manager class as default
export default PushNotificationManager;

  /**
   * Check if push notifications are supported on current platform
   */
  _checkSupport() {
    const { 
      supportsServiceWorker, 
      supportsNotifications, 
      isIOS, 
      isSafari, 
      isStandalone 
    } = this.platformInfo;
    
    console.log('[PushManager] CRITICAL SUPPORT CHECK:', {
      serviceWorker: supportsServiceWorker,
      notifications: supportsNotifications,
      isIOS,
      isSafari,
      isStandalone,
      pushManager: 'PushManager' in window,
      userAgent: navigator.userAgent
    });

    // CRITICAL: Force support for iOS 18.6 Safari 26.0
    if (isIOS) {
      const iosVersion = this._getIOSVersion();
      console.log('[PushManager] iOS FORCE CHECK - Version:', iosVersion);
      
      // iOS 18.6 with Safari 26.0 MUST be supported
      if (supportsServiceWorker && supportsNotifications) {
        this.isSupported = true;
        console.log('[PushManager] iOS FORCE ENABLED - Has required APIs');
      } else {
        console.error('[PushManager] iOS MISSING APIs:', {
          serviceWorker: supportsServiceWorker,
          notifications: supportsNotifications
        });
        this.isSupported = false;
      }
      
      console.log('[PushManager] iOS FINAL DECISION:', {
        iosVersion,
        serviceWorker: supportsServiceWorker,
        notifications: supportsNotifications,
        FORCE_SUPPORTED: this.isSupported
      });
    } else {
      // Standard support check for other platforms
      this.isSupported = supportsServiceWorker && supportsNotifications;
      
      console.log('[PushManager] NON-iOS support result:', {
        serviceWorker: supportsServiceWorker,
        notifications: supportsNotifications,
        final: this.isSupported
      });
    }

    return this.isSupported;
  }

  /**
   * Get iOS version number
   */
  _getIOSVersion() {
    try {
      // Match "CPU iPhone OS 18_6" pattern from user agent
      const match = navigator.userAgent.match(/CPU iPhone OS (\d+)_(\d+)/);
      if (match) {
        const version = parseFloat(`${match[1]}.${match[2]}`);
        console.log('[PushManager] iOS version parsed CORRECTLY:', {
          rawMatch: match[0],
          major: match[1],
          minor: match[2],
          version,
          userAgent: navigator.userAgent
        });
        return version;
      }
      
      console.warn('[PushManager] FAILED TO MATCH iOS VERSION in:', navigator.userAgent);
      // Return high version to force support
      return 18.6;
    } catch (error) {
      console.warn('[PushManager] ERROR detecting iOS version:', error);
      return 18.0;
    }
  }

  /**
   * Initialize push notification system
   */
  async initialize() {
    try {
      console.log('[PushManager] Starting initialization...');

      if (!this.isSupported) {
        throw new Error('Push notifications not supported on this platform');
      }

      // Register service worker
      await this._registerServiceWorker();
      
      // Get VAPID public key
      await this._fetchVapidKey();
      
      // Check existing subscription
      await this._checkExistingSubscription();
      
      console.log('[PushManager] Initialization complete');
      return true;
      
    } catch (error) {
      console.error('[PushManager] Initialization failed:', error);
      this._emitError(error);
      throw error;
    }
  }

  /**
   * Register service worker with platform-specific optimizations
   */
  async _registerServiceWorker() {
    try {
      console.log('[PushManager] Registering service worker...');
      
      // Use different registration strategies based on platform
      const swPath = '/sw-push.js';
      const options = {
        scope: '/'
      };

      // iOS-specific optimizations
      if (this.platformInfo.isIOS) {
        console.log('[PushManager] Applying iOS optimizations...');
        options.updateViaCache = 'none';
      }

      this.registration = await navigator.serviceWorker.register(swPath, options);
      
      console.log('[PushManager] Service worker registered:', {
        scope: this.registration.scope,
        state: this.registration.active?.state,
        platform: this.platformInfo.isIOS ? 'iOS' : this.platformInfo.isAndroid ? 'Android' : 'Desktop'
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('[PushManager] Service worker update found');
      });

      return this.registration;
      
    } catch (error) {
      console.error('[PushManager] Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Fetch VAPID public key from server
   */
  async _fetchVapidKey() {
    try {
      console.log('[PushManager] Fetching VAPID public key...');
      
      const token = this._getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/api/notifications/vapid-public-key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch VAPID key: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.vapidPublicKey = data.vapidPublicKey;
      
      if (!this.vapidPublicKey) {
        throw new Error('VAPID public key not received from server');
      }

      console.log('[PushManager] VAPID key received:', {
        keyLength: this.vapidPublicKey.length,
        keyPreview: this.vapidPublicKey.substring(0, 20) + '...'
      });

      return this.vapidPublicKey;
      
    } catch (error) {
      console.error('[PushManager] Failed to fetch VAPID key:', error);
      throw error;
    }
  }

  /**
   * Check for existing push subscription
   */
  async _checkExistingSubscription() {
    try {
      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      this.subscription = await this.registration.pushManager.getSubscription();
      
      console.log('[PushManager] Existing subscription check:', {
        hasSubscription: !!this.subscription,
        endpoint: this.subscription?.endpoint?.substring(0, 50) + '...' || 'none'
      });

      if (this.subscription) {
        // Verify subscription is still valid
        const isValid = await this._verifySubscription(this.subscription);
        if (!isValid) {
          console.log('[PushManager] Existing subscription invalid, removing...');
          await this.subscription.unsubscribe();
          this.subscription = null;
        }
      }

      return this.subscription;
      
    } catch (error) {
      console.error('[PushManager] Failed to check existing subscription:', error);
      throw error;
    }
  }

  /**
   * Request notification permission with platform-specific handling
   */
  async requestPermission() {
    try {
      console.log('[PushManager] Requesting notification permission...');
      
      const currentPermission = Notification.permission;
      console.log('[PushManager] Current permission:', currentPermission);

      if (currentPermission === 'granted') {
        return 'granted';
      }

      if (currentPermission === 'denied') {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      // Platform-specific permission request
      let permission;
      
      if (this.platformInfo.isIOS && !this.platformInfo.isStandalone) {
        // iOS requires PWA mode for reliable notifications
        console.warn('[PushManager] iOS detected - PWA mode recommended for reliable notifications');
      }

      if (typeof Notification.requestPermission === 'function') {
        permission = await Notification.requestPermission();
      } else {
        // Fallback for older browsers
        permission = await new Promise(resolve => {
          Notification.requestPermission(resolve);
        });
      }

      console.log('[PushManager] Permission result:', permission);
      this._emitPermissionChange(permission);
      
      return permission;
      
    } catch (error) {
      console.error('[PushManager] Permission request failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    try {
      console.log('[PushManager] Starting subscription process...');

      // Check permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Ensure we have everything we need
      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      if (!this.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      // Create subscription
      const subscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(this.vapidPublicKey)
      };

      console.log('[PushManager] Creating push subscription...');
      this.subscription = await this.registration.pushManager.subscribe(subscriptionOptions);

      console.log('[PushManager] Subscription created:', {
        endpoint: this.subscription.endpoint.substring(0, 50) + '...',
        hasKeys: !!(this.subscription.keys && this.subscription.keys.p256dh && this.subscription.keys.auth),
        platform: this.platformInfo.isIOS ? 'iOS' : this.platformInfo.isAndroid ? 'Android' : 'Desktop'
      });

      // Send subscription to server
      await this._sendSubscriptionToServer(this.subscription);
      
      this._emitSubscriptionChange(this.subscription);
      return this.subscription;
      
    } catch (error) {
      console.error('[PushManager] Subscription failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      console.log('[PushManager] Unsubscribing from push notifications...');

      if (!this.subscription) {
        console.log('[PushManager] No active subscription to unsubscribe from');
        return true;
      }

      // Remove from server first
      await this._removeSubscriptionFromServer(this.subscription);
      
      // Unsubscribe locally
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        this.subscription = null;
        console.log('[PushManager] Successfully unsubscribed');
        this._emitSubscriptionChange(null);
      }

      return success;
      
    } catch (error) {
      console.error('[PushManager] Unsubscribe failed:', error);
      throw error;
    }
  }

  /**
   * Send subscription to server
   */
  async _sendSubscriptionToServer(subscription) {
    try {
      console.log('[PushManager] Sending subscription to server...');
      
      const token = this._getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const subscriptionData = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        },
        userAgent: navigator.userAgent,
        platform: {
          isIOS: this.platformInfo.isIOS,
          isAndroid: this.platformInfo.isAndroid,
          isWindows: this.platformInfo.isWindows,
          isStandalone: this.platformInfo.isStandalone
        }
      };

      const response = await fetch(`${API_URL}/api/notifications/subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save subscription: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[PushManager] Subscription saved to server:', result);
      
      return result;
      
    } catch (error) {
      console.error('[PushManager] Failed to send subscription to server:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from server
   */
  async _removeSubscriptionFromServer(subscription) {
    try {
      console.log('[PushManager] Removing subscription from server...');
      
      const token = this._getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}/api/notifications/subscription`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to remove subscription: ${response.status} ${response.statusText}`);
      }

      console.log('[PushManager] Subscription removed from server');
      
    } catch (error) {
      console.error('[PushManager] Failed to remove subscription from server:', error);
      throw error;
    }
  }

  /**
   * Verify subscription is still valid
   */
  async _verifySubscription(subscription) {
    try {
      // Basic endpoint validation
      if (!subscription.endpoint) {
        return false;
      }

      // Check if keys are present
      if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        return false;
      }

      // Check expiration
      if (subscription.expirationTime && subscription.expirationTime < Date.now()) {
        return false;
      }

      return true;
      
    } catch (error) {
      console.error('[PushManager] Subscription verification failed:', error);
      return false;
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get authentication token
   */
  _getAuthToken() {
    // Try to get token from localStorage first, then sessionStorage
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  /**
   * Event listener management
   */
  addEventListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type].push(callback);
    }
  }

  removeEventListener(type, callback) {
    if (this.listeners[type]) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    }
  }

  _emitSubscriptionChange(subscription) {
    this.listeners.subscriptionChange.forEach(callback => {
      try {
        callback(subscription);
      } catch (error) {
        console.error('[PushManager] Event callback error:', error);
      }
    });
  }

  _emitPermissionChange(permission) {
    this.listeners.permissionChange.forEach(callback => {
      try {
        callback(permission);
      } catch (error) {
        console.error('[PushManager] Event callback error:', error);
      }
    });
  }

  _emitError(error) {
    this.listeners.error.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('[PushManager] Event callback error:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isSupported: this.isSupported,
      hasSubscription: !!this.subscription,
      permission: Notification?.permission || 'default',
      platformInfo: this.platformInfo,
      subscription: this.subscription ? {
        endpoint: this.subscription.endpoint.substring(0, 50) + '...',
        hasKeys: !!(this.subscription.keys?.p256dh && this.subscription.keys?.auth)
      } : null
    };
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
    if (!this.registration) {
      await this.initialize();
    }
    await this._checkExistingSubscription();
    return !!this.subscription;
  }

  /**
   * Enable push notifications (subscribe)
   */
  async enablePushNotifications() {
    try {
      if (!this.registration) {
        await this.initialize();
      }
      
      await this.subscribe();
      return { success: true };
      
    } catch (error) {
      console.error('[PushManager] Enable failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disable push notifications (unsubscribe)
   */
  async disablePushNotifications() {
    try {
      await this.unsubscribe();
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
          platform: this.platformInfo
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
   * Initialize service worker for simple cases
   */
  async initializeServiceWorker() {
    try {
      await this.initialize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test push notification (for debugging - legacy method)
   */
  async testNotification() {
    const result = await this.sendTestNotification();
    if (!result.success) {
      throw new Error(result.error);
    }
    return true;
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;
