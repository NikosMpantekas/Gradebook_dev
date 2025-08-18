import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, BellOff, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
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
  
  // Check if we're on a page where we don't want to show the notification manager
  const excludedPages = ['/home', '/about', '/contact'];
  const currentPath = window.location.pathname;
  const shouldRender = !excludedPages.includes(currentPath);
  
  // Don't render on excluded pages
  if (!shouldRender) {
    return null;
  }
  
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
      
      const vapidResponse = await axios.get(`${API_URL}/api/vapid/public-key`);
      const vapidPublicKey = vapidResponse.data.publicKey;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not received from server');
      }
      
      console.log('[Push] Step 2: VAPID public key received, converting to Uint8Array');
      
      // Convert VAPID public key to Uint8Array
      const vapidPublicKeyArray = urlBase64ToUint8Array(vapidPublicKey);
      
      console.log('[Push] Step 3: Getting service worker registration');
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      console.log('[Push] Step 4: Service worker ready, subscribing to push manager');
      
      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKeyArray
      });
      
      console.log('[Push] Step 5: Push subscription created, sending to backend');
      
      // Send subscription to backend
      const subscriptionResponse = await axios.post(`${API_URL}/api/vapid/subscribe`, {
        subscription: subscription,
        userId: user._id
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      console.log('[Push] Step 6: Subscription saved to backend:', subscriptionResponse.data);
      
      // Update local state
      setPushSubscription(subscription);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Push notifications enabled successfully!',
        severity: 'success'
      });
      
      // Close modal after successful subscription
      setTimeout(() => setIsModalOpen(false), 1500);
      
    } catch (err) {
      console.error('[Push] Error subscribing to push notifications:', err);
      setError(err.message || 'Failed to enable push notifications');
      
      setNotification({
        open: true,
        message: 'Failed to enable push notifications. Please try again.',
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
      // Unsubscribe from push manager
      await pushSubscription.unsubscribe();
      
      // Remove subscription from backend
      await axios.delete(`${API_URL}/api/vapid/unsubscribe`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        data: {
          userId: user._id
        }
      });
      
      // Update local state
      setPushSubscription(null);
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Push notifications disabled successfully',
        severity: 'success'
      });
      
      // Close modal after successful unsubscription
      setTimeout(() => setIsModalOpen(false), 1500);
      
    } catch (err) {
      console.error('[Push] Error unsubscribing from push notifications:', err);
      setError(err.message || 'Failed to disable push notifications');
      
      setNotification({
        open: true,
        message: 'Failed to disable push notifications. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String) => {
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
  };
  
  // Close notification
  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };
  
  // Don't render if user is not logged in or push is not supported
  if (!user || !pushSupported) {
    return null;
  }
  
  return (
    <TooltipProvider>
      {/* Floating Notification Toggle */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Floating Circle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`
                w-14 h-14 rounded-full shadow-lg transition-all duration-300 ease-in-out
                flex items-center justify-center
                ${pushSubscription 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }
                ${isHovered ? 'scale-110 shadow-xl' : 'scale-100'}
                hover:scale-110 active:scale-95
              `}
              aria-label={pushSubscription ? 'Notifications enabled' : 'Notifications disabled'}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : pushSubscription ? (
                <Bell className="h-6 w-6" />
              ) : (
                <BellOff className="h-6 w-6" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{pushSubscription ? 'Notifications enabled' : 'Notifications disabled'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Modal for Notification Settings */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md fade-in">
            <DialogHeader>
              <DialogTitle>Push Notifications</DialogTitle>
              <DialogDescription>
                Manage your push notification preferences
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get notified about important updates, grades, and announcements even when you're not using the app.
              </p>
              
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex space-x-2">
                {!pushSubscription ? (
                  <Button
                    onClick={subscribeToPushNotifications}
                    disabled={loading || pushPermission === 'denied'}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Enable Notifications
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={unsubscribeFromPushNotifications}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      <>
                        <BellOff className="mr-2 h-4 w-4" />
                        Disable Notifications
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {pushPermission === 'denied' && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg">
                  <p className="text-sm">
                    Notifications are blocked. Please enable them in your browser settings to receive updates.
                  </p>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Notifications are sent securely through your browser</p>
                <p>• You can disable them at any time</p>
                <p>• No personal data is shared with third parties</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Notification Snackbar */}
      {notification.open && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.severity === 'success' 
            ? 'bg-green-100 border border-green-200 text-green-800' 
            : notification.severity === 'warning'
            ? 'bg-yellow-100 border border-yellow-200 text-yellow-800'
            : 'bg-red-100 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{notification.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeNotification}
              className="h-6 w-6 p-0 text-current hover:bg-current/10"
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

export default PushNotificationManager;
