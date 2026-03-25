import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import PushNotificationManager from '../services/PushNotificationManager';
import authService from '../features/auth/authService';

const FloatingPushToggle = () => {
  const { user } = useSelector((state) => state.auth);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pushManager] = useState(() => new PushNotificationManager());

  // Load initial state from user and browser
  useEffect(() => {
    const loadPushState = async () => {
      if (!user) return;

      try {
        // Get user's database preference
        const userPref = user.pushNotificationEnabled !== false; // Default to true if undefined
        console.log('[FloatingPushToggle] User database preference:', userPref);
        
        // Check browser subscription status
        const hasSubscription = await pushManager.hasActiveSubscription();
        console.log('[FloatingPushToggle] Browser subscription status:', hasSubscription);
        
        // Toggle is enabled if both database says yes AND browser has subscription
        setIsEnabled(userPref && hasSubscription);
      } catch (error) {
        console.error('[FloatingPushToggle] Error loading push state:', error);
        setIsEnabled(false);
      }
    };

    loadPushState();
  }, [user, pushManager]);

  // Handle toggle click
  const handleToggle = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      if (isEnabled) {
        // User wants to disable notifications
        console.log('[FloatingPushToggle] Disabling push notifications');
        
        // 1. Update database first
        await authService.updatePushNotificationPreference(false);
        
        // 2. Update IndexedDB for service worker access
        await pushManager.updatePushNotificationPreference(false);
        
        // 3. Unsubscribe from browser (clears subscription)
        const unsubResult = await pushManager.disablePushNotifications();
        
        if (unsubResult.success) {
          setIsEnabled(false);
          console.log('[FloatingPushToggle] Successfully disabled push notifications');
        } else {
          console.error('[FloatingPushToggle] Failed to disable notifications:', unsubResult.error);
          // Revert database and IndexedDB changes if browser unsubscribe failed
          await authService.updatePushNotificationPreference(true);
          await pushManager.updatePushNotificationPreference(true);
        }
        
      } else {
        // User wants to enable notifications
        console.log('[FloatingPushToggle] Enabling push notifications');
        
        // 1. First clear any existing subscription to trigger fresh permission prompt
        await pushManager.clearExistingSubscription();
        
        // 2. Request new permission (this will show system popup)
        const enableResult = await pushManager.enablePushNotifications();
        
        if (enableResult.success) {
          // 3. Update database only if browser subscription succeeded
          await authService.updatePushNotificationPreference(true);
          
          // 4. Update IndexedDB for service worker access
          await pushManager.updatePushNotificationPreference(true);
          
          setIsEnabled(true);
          console.log('[FloatingPushToggle] Successfully enabled push notifications');
        } else {
          console.error('[FloatingPushToggle] Failed to enable notifications:', enableResult.error);
          // Keep database and IndexedDB as false since subscription failed
          await authService.updatePushNotificationPreference(false);
          await pushManager.updatePushNotificationPreference(false);
        }
      }
    } catch (error) {
      console.error('[FloatingPushToggle] Toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no user
  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 duration-500">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              size="icon"
              variant="ghost"
              className={`
                h-12 w-12 rounded-full 
                bg-background/80 backdrop-blur-sm border border-border/50
                shadow-lg shadow-black/10
                transition-all duration-300 ease-out
                hover:scale-110 hover:shadow-xl hover:shadow-black/20
                hover:bg-background/90 hover:border-border
                active:scale-95
                ${isLoading ? 'cursor-not-allowed animate-pulse' : ''}
              `}
            >
              {isLoading ? (
                <div className="relative h-5 w-5">
                  {/* Pulsing ring animation */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  {/* Spinning loader */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : isEnabled ? (
                <Bell className="h-5 w-5 text-primary transition-colors duration-200" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground transition-colors duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-background/95 backdrop-blur-sm border-border">
            <p className="text-sm">
              {isLoading 
                ? 'Processing...' 
                : isEnabled 
                  ? 'Click to disable push notifications' 
                  : 'Click to enable push notifications'
              }
            </p>
          </TooltipContent>
        </Tooltip>
        

      </div>
    </TooltipProvider>
  );
};

export default FloatingPushToggle;
