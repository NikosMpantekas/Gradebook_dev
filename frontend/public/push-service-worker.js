/* eslint-disable no-restricted-globals */

// This is a dedicated service worker for push notifications
// It handles push notifications separately from the main service worker

// Enhanced push event handler with comprehensive iOS debugging
self.addEventListener('push', async function(event) {
  console.log('[Push Service Worker] Push event received');
  
  // iOS DEBUGGING: Log push event details
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // CRITICAL iPhone DEBUG: Log EVERYTHING about the push event
  console.log('[Push Service Worker] CRITICAL iPhone DEBUG - Push Event Received:', {
    isIOS: isIOS,
    isMobile: isMobile,
    userAgent: navigator.userAgent,
    hasData: !!event.data,
    dataExists: event.data !== null && event.data !== undefined,
    timestamp: new Date().toISOString(),
    serviceWorkerState: self.registration?.active?.state,
    registrationScope: self.registration?.scope,
    eventConstructor: event.constructor.name
  });
  
  if (isIOS) {
    console.log('[Push Service Worker] iOS SPECIFIC DEBUG:', {
      hasData: !!event.data,
      dataText: event.data ? event.data.text() : 'no data',
      eventType: event.type,
      timestamp: new Date().toISOString(),
      serviceWorkerState: self.registration?.active?.state,
      pushManagerState: self.registration?.pushManager ? 'available' : 'not available',
      notificationPermission: Notification?.permission || 'unknown'
    });
  }

  // Ensure the event waits for our async operations
  event.waitUntil(
    (async () => {
      try {
        let data = { title: 'New Notification', body: 'You have a new notification' };
        
        // Try to parse the payload
        if (event.data) {
          try {
            data = event.data.json();
            console.log('[Push Service Worker] Push data:', data);
            
            // iOS DEBUGGING: Log payload structure for iOS debugging
            if (isIOS) {
              console.log('[Push Service Worker] iOS Payload Debug:', {
                hasTitle: !!data.title,
                hasBody: !!data.body,
                hasNotificationId: !!data.notificationId,
                payloadKeys: Object.keys(data)
              });
            }
          } catch (e) {
            console.error('[Push Service Worker] Error parsing push data:', e);
            // iOS DEBUGGING: Enhanced error logging for iOS
            if (isIOS) {
              console.error('[Push Service Worker] iOS Parse Error Details:', {
                error: e.message,
                rawData: event.data ? event.data.text() : 'No data',
                dataType: typeof event.data
              });
            }
            // Use the default if JSON parsing fails
          }
        } else {
          console.log('[Push Service Worker] No event data received');
          // iOS DEBUGGING: Log when no data is received on iOS
          if (isIOS) {
            console.log('[Push Service Worker] iOS No Data Debug:', {
              eventKeys: Object.keys(event),
              hasData: !!event.data,
              eventType: event.type
            });
          }
        }
        
        const title = data.title || 'GradeBook';
        const options = {
          body: data.body || 'New notification received',
          icon: '/logo192.png',
          badge: '/badge-icon.png',
          tag: data.notificationId || 'default-tag',
          data: {
            url: data.url || '/app/notifications',
            notificationId: data.notificationId
          },
          actions: [
            {
              action: 'view',
              title: 'View'
            }
          ],
          vibrate: data.urgent ? [100, 50, 100, 50, 100, 50, 100] : [100, 50, 100],
          renotify: !!data.urgent, // Only notify again if urgent
          requireInteraction: !!data.urgent // Keep notification visible if urgent
        };
        
        // Get all clients to check if any are visible
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        const focusedClient = clientList.find(client => client.focused);
        
        // Always show notification on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(self.navigator.userAgent);
        
        // iOS DEBUGGING: Enhanced client and notification display logging
        if (isIOS) {
          console.log('[Push Service Worker] iOS Client Debug:', {
            focusedClient: !!focusedClient,
            clientCount: clientList.length,
            isMobile,
            willShowNotification: !focusedClient || isMobile
          });
        }
        
        // CRITICAL iPhone FIX: Always show notifications on iOS devices
        // iPhone focus detection is unreliable, so always display notifications
        const shouldSkipNotification = focusedClient && !isMobile && !isIOS;
        
        if (shouldSkipNotification) {
          console.log('[Push Service Worker] Application is focused on desktop, posting message instead of notification');
          // Send the notification data to the focused client
          focusedClient.postMessage({
            type: 'PUSH_RECEIVED',
            notification: {
              ...data,
              title: title,
              options: options
            }
          });
          
          console.log('[Push Service Worker] Message posted to focused desktop client');
        } else {
          // ALWAYS show notification on iPhone/mobile OR when app not focused
          const reason = isIOS ? 'iOS device (always show)' : 
                        isMobile ? 'mobile device' : 
                        !focusedClient ? 'no focused client' : 
                        'fallback';
          console.log(`[Push Service Worker] Showing notification (${reason})`);
          
          // iOS DEBUGGING: Log notification display attempt for iOS
          if (isIOS) {
            console.log('[Push Service Worker] iOS Notification Display:', {
              title,
              optionsKeys: Object.keys(options),
              registrationScope: self.registration.scope,
              timestamp: new Date().toISOString()
            });
          }
          
          const notificationResult = await self.registration.showNotification(title, options);
          
          // iOS DEBUGGING: Log notification result for iOS
          if (isIOS) {
            console.log('[Push Service Worker] iOS Notification Result:', {
              result: notificationResult,
              success: notificationResult === undefined, // showNotification returns undefined on success
              timestamp: new Date().toISOString()
            });
            
            // CRITICAL iPhone FIX: Double-check notification was displayed
            setTimeout(async () => {
              try {
                const notifications = await self.registration.getNotifications();
                console.log('[Push Service Worker] iOS Notification Verification:', {
                  activeNotifications: notifications.length,
                  lastNotificationTitle: notifications[0]?.title,
                  timestamp: new Date().toISOString()
                });
                
                // If no notifications are active, try to force display
                if (notifications.length === 0) {
                  console.warn('[Push Service Worker] iOS WARNING: No active notifications found, attempting force display');
                  await self.registration.showNotification('iPhone Debug: Notification Test', {
                    body: 'This is a test notification to debug iPhone display issues',
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    tag: 'iphone-debug'
                  });
                }
              } catch (verifyError) {
                console.error('[Push Service Worker] iOS notification verification failed:', verifyError);
              }
            }, 1000);
          }
          
          return notificationResult;
        }
      } catch (error) {
        console.error('[Push Service Worker] Error handling push:', error);
        // Fallback to a basic notification if anything fails
        return self.registration.showNotification('GradeBook', {
          body: 'You have a new notification',
          icon: '/logo192.png'
        });
      }
    })()
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Push Service Worker] Notification click received:', event.notification.tag);
  
  // Close the notification
  event.notification.close();
  
  // Get the notification data
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/app/notifications';
  
  // This handles notification actions if present
  let targetUrl = url;
  if (event.action === 'view' && notificationData.notificationId) {
    targetUrl = `/app/notifications/${notificationData.notificationId}`;
  }
  
  // Focus or open a window when the user clicks the notification
  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        // Try to find an open window and focus it
        for (const client of clientList) {
          // If we find a window with the same origin
          if (new URL(client.url).origin === self.location.origin) {
            await client.focus();
            // Navigate the focused client to the target URL
            return client.navigate(targetUrl);
          }
        }
        
        // If no window is open, open a new one
        return self.clients.openWindow(targetUrl);
      } catch (error) {
        console.error('[Push Service Worker] Error handling notification click:', error);
        // If anything fails, at least try to open a new window
        return self.clients.openWindow('/app/notifications');
      }
    })()
  );
});

// Handle subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Push Service Worker] Push subscription changed');
  
  // The subscription object has changed, we need to update the server
  event.waitUntil(
    (async () => {
      try {
        // Get the new subscription from the event if available
        const newSubscription = event.newSubscription;
        
        if (newSubscription) {
          // Get the base URL from the service worker scope
          const baseUrl = self.registration.scope;
          
          // Send the new subscription to the server using the correct base URL
          const response = await fetch(`${baseUrl}api/notifications/subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // We don't have the auth token here, so we'll rely on cookies
            },
            body: JSON.stringify(newSubscription)
          });
          
          if (!response.ok) {
            throw new Error('Failed to update subscription on server');
          }
          
          console.log('[Push Service Worker] Push subscription updated on server');
        }
      } catch (error) {
        console.error('[Push Service Worker] Error updating subscription:', error);
      }
    })()
  );
});

// Listen for the install event to handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[Push Service Worker] Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Listen for the activate event to handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Push Service Worker] Activating...');
  // Claim clients to control pages immediately
  event.waitUntil(self.clients.claim());
});
