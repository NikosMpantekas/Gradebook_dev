import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Bell, BellOff } from 'lucide-react';
import { Button } from './ui/button';
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
        
        // 2. Unsubscribe from browser (clears subscription)
        const unsubResult = await pushManager.disablePushNotifications();
        
        if (unsubResult.success) {
          setIsEnabled(false);
          console.log('[FloatingPushToggle] Successfully disabled push notifications');
        } else {
          console.error('[FloatingPushToggle] Failed to disable notifications:', unsubResult.error);
          // Revert database change if browser unsubscribe failed
          await authService.updatePushNotificationPreference(true);
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
          setIsEnabled(true);
          console.log('[FloatingPushToggle] Successfully enabled push notifications');
        } else {
          console.error('[FloatingPushToggle] Failed to enable notifications:', enableResult.error);
          // Keep database as false since subscription failed
          await authService.updatePushNotificationPreference(false);
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
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleToggle}
        disabled={isLoading}
        size="lg"
        className={`
          h-14 w-14 rounded-full shadow-lg transition-all duration-200 hover:scale-105
          ${isEnabled 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-gray-500 hover:bg-gray-600 text-white'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isEnabled ? 'Disable Push Notifications' : 'Enable Push Notifications'}
      >
        {isLoading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isEnabled ? (
          <Bell className="h-6 w-6" />
        ) : (
          <BellOff className="h-6 w-6" />
        )}
      </Button>
      
      {/* Status indicator dot */}
      <div className={`
        absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white
        ${isEnabled ? 'bg-green-400' : 'bg-red-400'}
      `} />
    </div>
  );
};

export default FloatingPushToggle;
