import React, { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import offlineManager from '../utils/offlineManager';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const OfflineDetector = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Listen to global offline manager
  useEffect(() => {
    const handleOfflineStateChange = (isOffline) => {
      console.log('OfflineDetector: State changed to', isOffline ? 'offline' : 'online');
      setIsOnline(!isOffline);
      if (!isOffline) {
        setRetryCount(0);
      }
    };

    // Subscribe to offline manager
    offlineManager.addListener(handleOfflineStateChange);

    return () => {
      offlineManager.removeListener(handleOfflineStateChange);
    };
  }, []);

  // Simple connectivity check function
  const checkConnectivity = async () => {
    try {
      // Try multiple endpoints to be more robust
      const endpoints = ['/api/health', '/api/users/me', '/api/schools'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: 3000
          });
          
          if (response.status === 200) {
            offlineManager.setOfflineState(false);
            return true;
          }
        } catch (error) {
          console.log(`Failed to reach ${endpoint}:`, error.message);
          continue;
        }
      }
      
      // If we get here, all endpoints failed
      offlineManager.setOfflineState(true);
      return false;
    } catch (error) {
      console.log('All connectivity checks failed:', error.message);
      offlineManager.setOfflineState(true);
      return false;
    }
  };

  // Listen for browser online/offline events as backup
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Browser went online, checking connectivity...');
      setIsChecking(true);
      const isConnected = await checkConnectivity();
      setIsChecking(false);
      
      if (isConnected) {
        console.log('Connectivity confirmed, going online');
      }
    };

    const handleOffline = () => {
      console.log('Browser went offline');
      offlineManager.setOfflineState(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manual retry function
  const handleRetry = async () => {
    setIsChecking(true);
    setRetryCount(prev => prev + 1);
    
    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        console.log('Manual retry successful');
      }
    } catch (error) {
      console.error('Manual retry failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // If online, render children normally
  if (isOnline) {
    return children;
  }

  // Offline state UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-8xl font-bold text-muted-foreground/5">
            &lt;/&gt;
          </span>
        </div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-center mb-4">
            <WifiOff className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10 space-y-4">
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. 
            Some features may not work properly.
          </p>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Wifi className="h-4 w-4" />
              <span>Check your internet connection and try again</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
            
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Attempt {retryCount} - Still offline
              </p>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• You can still view cached content</p>
            <p>• Changes will sync when you're back online</p>
            <p>• Try refreshing the page if the issue persists</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineDetector; 