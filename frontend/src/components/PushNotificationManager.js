import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Snackbar, Alert, Box, Typography, CircularProgress, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import axios from 'axios';
import { API_URL } from '../config/appConfig';

/**
 * PushNotificationManager component
 * Handles push notification subscriptions and permissions
 * This component should be included in App.js or a layout component
 */
const PushNotificationManager = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushSubscription, setPushSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Check if push notifications are supported and get current subscription status
  useEffect(() => {
    const checkPushSupport = async () => {
      if (!user) return;
      
      // Check if service worker and push manager are supported
      const swSupported = 'serviceWorker' in navigator;
      const pushSupported = 'PushManager' in window;
      
      if (swSupported && pushSupported) {
        setPushSupported(true);
        console.log('[Push] Push notifications are supported');
        
        try {
          // Get push permission status
          const permission = Notification.permission;
          setPushPermission(permission);
          console.log(`[Push] Current notification permission: ${permission}`);
          
          // Check if we have a push worker registered
          const pushWorkerRegistered = sessionStorage.getItem('pushWorkerRegistered') === 'true';
          if (!pushWorkerRegistered) {
            console.log('[Push] Push worker not yet registered');
            return;
          }
          
          // Get current subscription
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushSubscription(subscription);
          
          if (subscription) {
            console.log('[Push] User is already subscribed to push notifications');
          } else {
            console.log('[Push] User is not subscribed to push notifications');
          }
        } catch (err) {
          console.error('[Push] Error checking push status:', err);
          setError('Failed to check push notification status');
        }
      } else {
        console.log('[Push] Push notifications are not supported');
        setPushSupported(false);
      }
    };
    
    checkPushSupport();
  }, [user]);
  
  // Function to request notification permission and subscribe
  const subscribeToPushNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        
        if (permission !== 'granted') {
          setNotification({
            open: true,
            message: 'Notification permission denied. Please enable notifications in your browser settings.',
            severity: 'warning'
          });
          setLoading(false);
          return;
        }
      }
      
      // Get VAPID public key from backend - use API_URL for secure HTTPS in production
      console.log('[Push] Step 1: Fetching VAPID public key using API_URL:', API_URL);
      console.log('[Push] Request headers:', {
        hasToken: !!user.token,
        tokenPreview: user.token ? user.token.substring(0, 20) + '...' : 'none'
      });
      
      const vapidResponse = await axios.get(`${API_URL}/api/notifications/vapid-public-key`, {
        headers: { 
          'Authorization': `Bearer ${user.token}`
          // REMOVED Cache-Control header to fix CORS error
        }
      });
      
      console.log('[Push] Step 1 SUCCESS: VAPID response received', {
        status: vapidResponse.status,
        hasData: !!vapidResponse.data,
        hasPublicKey: !!(vapidResponse.data && vapidResponse.data.publicKey),
        dataKeys: vapidResponse.data ? Object.keys(vapidResponse.data) : 'no data'
      });
      
      // Handle HTTP 304 (Not Modified) responses - data might be cached
      let publicKey = null;
      if (vapidResponse.data && vapidResponse.data.publicKey) {
        publicKey = vapidResponse.data.publicKey;
      } else if (vapidResponse.status === 304) {
        // For 304 responses, try to get cached VAPID key from localStorage
        const cachedKey = localStorage.getItem('vapidPublicKey');
        if (cachedKey) {
          console.log('[Push] Using cached VAPID public key for 304 response');
          publicKey = cachedKey;
        } else {
          // If no cached key, force a fresh request
          console.log('[Push] No cached VAPID key found, forcing fresh request');
          const freshResponse = await axios.get(`${API_URL}/api/notifications/vapid-public-key`, {
            headers: { 
              'Authorization': `Bearer ${user.token}`,
              'Cache-Control': 'no-cache'
            }
          });
          publicKey = freshResponse.data.publicKey;
        }
      }
      
      if (!publicKey) {
        throw new Error('Failed to get VAPID public key');
      }
      
      // Cache the VAPID public key for future 304 responses
      localStorage.setItem('vapidPublicKey', publicKey);
      
      console.log('[Push] Step 2: Converting VAPID key to Uint8Array');
      // Convert base64 public key to Uint8Array
      const convertedPublicKey = urlBase64ToUint8Array(publicKey);
      console.log('[Push] Step 2 SUCCESS: VAPID key converted', {
        originalLength: publicKey.length,
        convertedLength: convertedPublicKey.length
      });
      
      console.log('[Push] Step 3: Getting service worker registration');
      // Get service worker registration and subscribe
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Step 3 SUCCESS: Service worker ready', {
        scope: registration.scope,
        hasPushManager: !!registration.pushManager
      });
      
      console.log('[Push] Step 4: Checking for existing subscription');
      // Unsubscribe from any existing subscription first to ensure a clean state
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[Push] Step 4: Found existing subscription, unsubscribing');
        await existingSubscription.unsubscribe();
        console.log('[Push] Step 4 SUCCESS: Existing subscription removed');
      } else {
        console.log('[Push] Step 4: No existing subscription found');
      }
      
      console.log('[Push] Step 5: Creating new push subscription');
      // Create new subscription
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedPublicKey
      });
      console.log('[Push] Step 5 SUCCESS: New subscription created', {
        endpoint: newSubscription.endpoint?.substring(0, 50) + '...',
        hasGetKey: !!newSubscription.getKey
      });
      
      console.log('[Push] Successfully created subscription');
      setPushSubscription(newSubscription);
      
      // CRITICAL HOTFIX: Handle subscription properly without causing errors
      console.log('[Push] New subscription object:', JSON.stringify(newSubscription));
      
      try {
        // Handle subscription more carefully to avoid errors
        // Extract only what we need directly from the raw subscription
        const rawEndpoint = newSubscription.endpoint;
        const rawExpirationTime = newSubscription.expirationTime;
        
        // Sometimes the subscription is a non-standard format, so we need to extract carefully
        let p256dh = '';
        let auth = '';
        
        // Try multiple possible paths to get keys
        if (newSubscription.getKey) {
          try {
            // Use standard method if available
            p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('p256dh'))));
            auth = btoa(String.fromCharCode.apply(null, new Uint8Array(newSubscription.getKey('auth'))));
            console.log('[Push] Successfully extracted keys using getKey() method');
          } catch (keyError) {
            console.warn('[Push] Error extracting keys using getKey():', keyError.message);
          }
        } 
        
        // Fallback to direct properties if getKey failed or isn't available
        if ((!p256dh || !auth) && newSubscription.keys) {
          p256dh = newSubscription.keys.p256dh || '';
          auth = newSubscription.keys.auth || '';
          console.log('[Push] Using direct key properties from subscription');
        }
        
        // Create subscription data with all the safeguards
        const subscriptionData = {
          endpoint: rawEndpoint,
          expirationTime: rawExpirationTime || null,
          keys: {
            p256dh: p256dh,
            auth: auth
          }
        };
        
        // Extra validation
        if (!subscriptionData.endpoint) {
          throw new Error('Missing endpoint in subscription');
        }
        
        if (!subscriptionData.keys.p256dh || !subscriptionData.keys.auth) {
          console.warn('[Push] Subscription appears to have invalid or missing keys, but will attempt to send anyway');
        }
        
        // Log the subscription data we're sending
        console.log('[Push] Subscription data to send:', {
          endpoint: subscriptionData.endpoint?.substring(0, 50) + '...',
          expirationTime: subscriptionData.expirationTime,
          hasP256dh: !!subscriptionData.keys.p256dh,
          hasAuth: !!subscriptionData.keys.auth
        });
        
        console.log('[Push] Step 6: Sending subscription data to server');
        console.log('[Push] Server request details:', {
          url: `${API_URL}/api/notifications/subscription`,
          hasEndpoint: !!subscriptionData.endpoint,
          hasKeys: !!(subscriptionData.keys.p256dh && subscriptionData.keys.auth),
          hasToken: !!user.token
        });
        
        // Send subscription to server
        const serverResponse = await axios.post(`${API_URL}/api/notifications/subscription`, 
          subscriptionData,
          { 
            headers: { 
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        
        console.log('[Push] Step 6 SUCCESS: Subscription sent to server', {
          status: serverResponse.status,
          responseData: serverResponse.data
        });
        
        setNotification({
          open: true,
          message: 'Successfully subscribed to push notifications!',
          severity: 'success'
        });
        
        console.log('[Push] Push notification subscription successful');
      } catch (innerError) {
        console.error('[Push] Error processing subscription data:', innerError);
        throw new Error('Failed to process subscription: ' + innerError.message);
      }
    } catch (err) {
      console.error('[Push] Error subscribing to push notifications:', {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        errorCode: err.code,
        networkError: err.response?.status || 'No response',
        responseData: err.response?.data || 'No response data'
      });
      
      // More specific error messages
      let userMessage = 'Failed to subscribe to push notifications';
      if (err.name === 'NetworkError' || err.code === 'NETWORK_ERROR') {
        userMessage = 'Network error - please check your connection and try again';
      } else if (err.response?.status === 401) {
        userMessage = 'Authentication error - please log in again';
      } else if (err.response?.status === 403) {
        userMessage = 'Permission denied - contact administrator';
      } else if (err.message.includes('VAPID')) {
        userMessage = 'Server configuration error - contact support';
      } else if (err.message.includes('permission')) {
        userMessage = 'Please allow notifications in your browser settings';
      }
      
      setError('Failed to subscribe to push notifications');
      setNotification({
        open: true,
        message: `${userMessage}: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to unsubscribe from push notifications
  const unsubscribeFromPushNotifications = async () => {
    if (!user || !pushSubscription) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Unsubscribe from push
      await pushSubscription.unsubscribe();
      setPushSubscription(null);
      
      // Notify server about unsubscription
      await axios.delete(`${API_URL}/api/notifications/push-subscription`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setNotification({
        open: true,
        message: 'Successfully unsubscribed from push notifications',
        severity: 'success'
      });
      
      console.log('[Push] Successfully unsubscribed from push notifications');
    } catch (err) {
      console.error('[Push] Error unsubscribing from push notifications:', err);
      setError('Failed to unsubscribe from push notifications');
      setNotification({
        open: true,
        message: `Failed to unsubscribe from push notifications: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Convert base64 to Uint8Array for the applicationServerKey
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };
  
  // Handle notification close
  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') return;
    setNotification({ ...notification, open: false });
  };
  
  // Don't render anything if user is not logged in or if push is not supported
  if (!user || !pushSupported) {
    return null;
  }

  // Don't render on home page
  if (window.location.pathname === '/home' || window.location.pathname === '/' || window.location.pathname === '/about' || window.location.pathname === '/contact' || window.location.pathname === '/maintenance') {
    return null;
  }

  return (
    <>
      {/* Notification toggle button */}
      <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
        <Tooltip title={pushSubscription ? "Turn off notifications" : "Turn on notifications"}>
          <Button 
            variant="contained" 
            color={pushSubscription ? "secondary" : "primary"}
            size="medium"
            disabled={loading}
            onClick={pushSubscription ? unsubscribeFromPushNotifications : subscribeToPushNotifications}
            sx={{ 
              borderRadius: '50%', 
              minWidth: 0, 
              width: 56, 
              height: 56,
              boxShadow: 3 
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : pushSubscription ? (
              <NotificationsIcon />
            ) : (
              <NotificationsOffIcon />
            )}
          </Button>
        </Tooltip>
      </Box>
      
      {/* Centered notification alert */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          width: '100%',
          maxWidth: { xs: '90%', sm: '80%', md: '60%' },
          '& .MuiPaper-root': {
            width: '100%',
            borderRadius: 2,
            boxShadow: 3
          }
        }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            alignItems: 'center',
            fontSize: '1rem'
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default PushNotificationManager;
