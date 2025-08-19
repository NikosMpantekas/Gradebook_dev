/* eslint-disable no-restricted-globals */

// This is a dedicated service worker for push notifications
// It handles push notifications separately from the main service worker

// Enhanced push event handler with comprehensive iOS debugging
self.addEventListener('push', async function(event) {
  console.log('[Push Service Worker] CRITICAL: Push event received at', new Date().toISOString());
  
  // FORCE NOTIFICATION DISPLAY - Always show notification regardless of conditions
  console.log('[Push Service Worker] FORCE DISPLAY MODE - Will show notification unconditionally');
  
  // iOS DEBUGGING: Log push event details
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // CRITICAL DEBUG: Log EVERYTHING about the push event
  console.log('[Push Service Worker] CRITICAL DEBUG - Push Event Details:', {
    isIOS: isIOS,
    isMobile: isMobile,
    userAgent: navigator.userAgent,
    hasData: !!event.data,
    dataExists: event.data !== null && event.data !== undefined,
    timestamp: new Date().toISOString(),
    serviceWorkerState: self.registration?.active?.state,
    registrationScope: self.registration?.scope,
    eventConstructor: event.constructor.name,
    eventKeys: Object.keys(event)
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
        
        // FORCE NOTIFICATION DISPLAY - Skip all complex logic and always show notification
        console.log('[Push Service Worker] FORCING NOTIFICATION DISPLAY - Bypassing all client checks');
        
        // Simplified notification display with maximum debugging
        console.log('[Push Service Worker] About to display notification:', {
          title,
          body: options.body,
          timestamp: new Date().toISOString(),
          registrationExists: !!self.registration,
          showNotificationExists: typeof self.registration?.showNotification === 'function'
        });
        
        // FORCE DISPLAY - Always show notification
        try {
          const notificationResult = await self.registration.showNotification(title, options);
          console.log('[Push Service Worker] FORCED notification display result:', notificationResult);
          
          // Verify notification was created
          setTimeout(async () => {
            try {
              const notifications = await self.registration.getNotifications();
              console.log('[Push Service Worker] VERIFICATION - Active notifications:', {
                count: notifications.length,
                titles: notifications.map(n => n.title),
                timestamp: new Date().toISOString()
              });
              
              if (notifications.length === 0) {
                console.error('[Push Service Worker] CRITICAL ERROR: No notifications found after display attempt');
                // Emergency fallback notification
                await self.registration.showNotification('GradeBook Emergency Test', {
                  body: 'Emergency test notification - please report if you see this',
                  icon: '/logo192.png',
                  tag: 'emergency-test'
                });
              }
            } catch (verifyError) {
              console.error('[Push Service Worker] Verification failed:', verifyError);
            }
          }, 500);
          
          return notificationResult;
        } catch (displayError) {
          console.error('[Push Service Worker] CRITICAL ERROR displaying notification:', displayError);
          throw displayError;
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
