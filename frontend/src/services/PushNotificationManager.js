/**
 * Modern PWA Push Notification Manager
 * Cross-platform compatible push notification service
 * Follows 2024 PWA standards for iOS, Android, Windows compatibility
 */

import { API_URL } from '../config/appConfig';

class PushNotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = null;
    this.isSupported = false;
    this.platformInfo = this._detectPlatform();
    
    // Event listeners for state changes
    this.listeners = {
      subscriptionChange: [],
      permissionChange: [],
      error: []
    };

    console.log('[PushManager] Initializing for platform:', this.platformInfo);
    this._checkSupport();
  }

  /**
   * Public method to check if push notifications are supported
   */
  isSupported() {
    return this.isSupported;
  }

  /**
   * Public method to get platform detection info
   */
  detectPlatform() {
    return this.platformInfo;
  }

  /**
   * Public method to check if in PWA mode
   */
  isPWAMode() {
    return this.platformInfo.isStandalone;
  }

  /**
   * Detect platform and capabilities
   */
  _detectPlatform() {
    const ua = navigator.userAgent;
    return {
      isIOS: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      isAndroid: /Android/.test(ua),
      isWindows: /Windows/.test(ua),
      isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
      isChrome: /Chrome/.test(ua),
      isFirefox: /Firefox/.test(ua),
      isStandalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsPushManager: 'PushManager' in window,
      supportsNotifications: 'Notification' in window
    };
  }

  /**
   * Check if push notifications are supported on current platform
   */
  _checkSupport() {
    const { 
      supportsServiceWorker, 
      supportsPushManager, 
      supportsNotifications,
      isIOS,
      isSafari,
      isAndroid,
      isChrome,
      isFirefox
    } = this.platformInfo;
    
    // More lenient support check for mobile devices
    let isSupported = false;
    
    // iOS Safari 16.4+ supports push notifications in PWA mode
    if (isIOS && isSafari) {
      // Check if we're in standalone/PWA mode or if push is available
      const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
      isSupported = supportsServiceWorker && supportsNotifications && (isStandalone || supportsPushManager);
      console.log('[PushManager] iOS Safari detection:', { isStandalone, supportsServiceWorker, supportsNotifications, supportsPushManager });
    }
    // Android Chrome and other mobile browsers
    else if (isAndroid || isChrome || isFirefox) {
      isSupported = supportsServiceWorker && supportsPushManager && supportsNotifications;
    }
    // Desktop browsers
    else {
      isSupported = supportsServiceWorker && supportsPushManager && supportsNotifications;
    }
    
    // Fallback: if standard checks pass, assume supported
    if (!isSupported && supportsServiceWorker && supportsNotifications) {
      console.log('[PushManager] Fallback support check - allowing based on service worker + notifications');
      isSupported = true;
    }
    
    this.isSupported = isSupported;
    
    console.log('[PushManager] Support check:', {
      serviceWorker: supportsServiceWorker,
      pushManager: supportsPushManager,
      notifications: supportsNotifications,
      isIOS,
      isSafari,
      isAndroid,
      isChrome,
      overall: this.isSupported,
      userAgent: navigator.userAgent
    });

    return this.isSupported;
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
   * Test push notification (for debugging)
   */
  async testNotification() {
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
          title: 'Test Notification',
          body: 'This is a test push notification',
          platform: this.platformInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Test notification failed: ${response.status} ${response.statusText}`);
      }

      console.log('[PushManager] Test notification sent');
      return true;
      
    } catch (error) {
      console.error('[PushManager] Test notification failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();
export default pushNotificationManager;
