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
 * Send subscription to server with enhanced iOS debugging
 */
const sendSubscriptionToServer = async (subscription) => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/api/notifications/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    // iOS DEBUGGING: Log server response
    if (isIOS) {
      console.log('[Push Service] iOS Server Registration Success:', {
        status: response.status,
        resultKeys: Object.keys(result),
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    if (isIOS) {
      console.error('[Push Service] iOS Server Registration Error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    throw error;
  }
};

/**
 * Convert base64 string to Uint8Array
 * @param {string} base64String - Base64 encoded string
 * @returns {Uint8Array} Converted array
 */
const urlBase64ToUint8Array = (base64String) => {
  try {
    // Remove any padding or whitespace
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Decode the base64 string
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.error('Failed to convert base64 to Uint8Array:', error);
    throw new Error('Invalid VAPID key format');
  }
};

/**
 * Setup push notifications with enhanced iOS debugging
 */
export const setupPushNotifications = async () => {
  return await initializePushNotifications();
};

/**
 * Enhanced initializePushNotifications with iOS debugging
 */
export const initializePushNotifications = async () => {
  try {
    console.log('[Push Service] Initializing push notifications');
    
    // iOS DEBUGGING: Enhanced browser and device detection
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    
    console.log('[Push Service] iOS Debug Info:', {
      userAgent: navigator.userAgent,
      isIOS,
      isSafari,
      isStandalone,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      timestamp: new Date().toISOString()
    });
    
    // Check if the browser supports service workers and push messaging
    if (!('serviceWorker' in navigator)) {
      const error = 'Service workers not supported';
      if (isIOS) {
        console.error('[Push Service] iOS Service Worker Error:', error);
      }
      throw new Error(error);
    }

    if (!('PushManager' in window)) {
      const error = 'Push messaging not supported';
      if (isIOS) {
        console.error('[Push Service] iOS Push Manager Error:', error);
      }
      throw new Error(error);
    }
    
    console.log('Push notification prerequisites check passed');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      const error = 'This browser does not support desktop notifications';
      if (isIOS) {
        console.error('[Push Service] iOS Notification Error:', error);
      }
      throw new Error(error);
    }

    // iOS DEBUGGING: Log notification permission state
    if (isIOS) {
      console.log('[Push Service] iOS Notification Permission State:', {
        permission: Notification.permission,
        canRequestPermission: typeof Notification.requestPermission === 'function'
      });
    }

    // Register the service worker
    console.log('[Push Service] Registering service worker...');
    const registration = await navigator.serviceWorker.register('/push-service-worker.js', {
      scope: '/'
    });

    console.log('[Push Service] Service worker registered:', registration.scope);
    
    // iOS DEBUGGING: Log service worker registration details
    if (isIOS) {
      console.log('[Push Service] iOS Service Worker Registration:', {
        scope: registration.scope,
        active: !!registration.active,
        installing: !!registration.installing,
        waiting: !!registration.waiting,
        updateViaCache: registration.updateViaCache
      });
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push Service] Service worker ready');
    
    // iOS DEBUGGING: Log service worker ready state
    if (isIOS) {
      const readyRegistration = await navigator.serviceWorker.ready;
      console.log('[Push Service] iOS Service Worker Ready:', {
        scope: readyRegistration.scope,
        active: !!readyRegistration.active,
        pushManager: !!readyRegistration.pushManager
      });
    }
    
    // Get VAPID public key from server with authentication
    console.log('[Push Service] Fetching VAPID public key...');
    const token = localStorage.getItem('token');
    if (!token) {
      const error = 'No authentication token found for VAPID key fetch';
      if (isIOS) {
        console.error('[Push Service] iOS Auth Error:', error);
      }
      throw new Error(error);
    }

    const response = await fetch(`${API_URL}/api/notifications/vapid-public-key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = `Failed to fetch VAPID public key (${response.status}: ${response.statusText})`;
      if (isIOS) {
        console.error('[Push Service] iOS VAPID Fetch Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          hasAuthHeader: true
        });
      }
      throw new Error(error);
    }
    const { publicKey } = await response.json();
    
    console.log('[Push Service] VAPID public key received');
    
    // iOS DEBUGGING: Log VAPID key details
    if (isIOS) {
      console.log('[Push Service] iOS VAPID Key Debug:', {
        publicKeyLength: publicKey?.length,
        publicKeyPreview: publicKey?.substring(0, 20) + '...'
      });
    }

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    
    if (existingSubscription) {
      console.log('[Push Service] Found existing subscription');
      
      // iOS DEBUGGING: Log existing subscription details
      if (isIOS) {
        console.log('[Push Service] iOS Existing Subscription:', {
          endpoint: existingSubscription.endpoint,
          hasKeys: !!existingSubscription.getKey,
          p256dhKey: existingSubscription.getKey ? !!existingSubscription.getKey('p256dh') : false,
          authKey: existingSubscription.getKey ? !!existingSubscription.getKey('auth') : false
        });
      }
      
      // Verify the subscription is still valid by sending it to the server
      try {
        await sendSubscriptionToServer(existingSubscription);
        console.log('[Push Service] Existing subscription verified');
        return { success: true, subscription: existingSubscription };
      } catch (error) {
        console.warn('[Push Service] Existing subscription invalid, creating new one:', error.message);
        if (isIOS) {
          console.warn('[Push Service] iOS Subscription Verification Failed:', error.message);
        }
        await existingSubscription.unsubscribe();
      }
    } else if (isIOS) {
      console.log('[Push Service] iOS: No existing subscription found');
    }
    
    // Subscribe to push notifications
    console.log('[Push Service] Creating new push subscription...');
    
    // iOS DEBUGGING: Log subscription attempt
    if (isIOS) {
      console.log('[Push Service] iOS Subscription Attempt:', {
        userVisibleOnly: true,
        applicationServerKeyLength: urlBase64ToUint8Array(publicKey).length,
        timestamp: new Date().toISOString()
      });
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('[Push Service] New subscription created');
    
    // iOS DEBUGGING: Log new subscription details
    if (isIOS) {
      console.log('[Push Service] iOS New Subscription:', {
        endpoint: subscription.endpoint,
        hasKeys: !!subscription.getKey,
        p256dhKey: subscription.getKey ? !!subscription.getKey('p256dh') : false,
        authKey: subscription.getKey ? !!subscription.getKey('auth') : false,
        endpointDomain: new URL(subscription.endpoint).hostname,
        timestamp: new Date().toISOString()
      });
    }

    // Send subscription to server
    console.log('[Push Service] Sending subscription to server...');
    await sendSubscriptionToServer(subscription);
    
    console.log('[Push Service] Push notifications initialized successfully');
    return { success: true, subscription };

  } catch (error) {
    console.error('[Push Service] Failed to initialize push notifications:', error);
    
    // iOS DEBUGGING: Enhanced error logging for iOS
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      console.error('[Push Service] iOS Initialization Error Details:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        notificationPermission: Notification.permission,
        timestamp: new Date().toISOString()
      });
    }
    
    return { success: false, error: error.message };
  }
};

export const unsubscribeFromPushNotifications = async () => {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe
        await subscription.unsubscribe();
        
        // Send request to server to delete subscription
        const endpoint = subscription.endpoint;
        // Use axiosInstance which automatically handles token inclusion
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
