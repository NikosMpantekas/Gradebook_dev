import React, { useState, useEffect } from "react";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import offlineManager from "../utils/offlineManager";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const OfflineDetector = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Listen to global offline manager
  useEffect(() => {
    const handleOfflineStateChange = (isOffline) => {
      console.log(
        "OfflineDetector: State changed to",
        isOffline ? "offline" : "online",
      );
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
      const endpoints = ["/api/health", "/api/users/me", "/api/schools"];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: 3000,
          });

          if (response.status >= 200 && response.status < 500) {
            offlineManager.setOfflineState(false);
            return true;
          }
        } catch (error) {
          // A response with an error status still means the server is reachable
          if (error.response) {
            offlineManager.setOfflineState(false);
            return true;
          }
          console.log(`Failed to reach ${endpoint}:`, error.message);
          continue;
        }
      }

      // If we get here, all endpoints failed
      offlineManager.setOfflineState(true);
      return false;
    } catch (error) {
      console.log("All connectivity checks failed:", error.message);
      offlineManager.setOfflineState(true);
      return false;
    }
  };

  // Listen for browser online/offline events as backup
  useEffect(() => {
    const handleOnline = async () => {
      console.log("Browser went online, checking connectivity...");
      setIsChecking(true);
      const isConnected = await checkConnectivity();
      setIsChecking(false);

      if (isConnected) {
        console.log("Connectivity confirmed, reloading page...");
        window.location.reload();
      }
    };

    const handleOffline = () => {
      console.log("Browser went offline");
      offlineManager.setOfflineState(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Manual retry function
  const handleRetry = async () => {
    setIsChecking(true);
    setRetryCount((prev) => prev + 1);

    try {
      const isConnected = await checkConnectivity();
      if (isConnected) {
        console.log("Manual retry successful, reloading page...");
        window.location.reload();
      }
    } catch (error) {
      console.error("Manual retry failed:", error);
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
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <WifiOff className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-4">You're Offline</h2>

      <p className="text-muted-foreground mb-8 max-w-md">
        It looks like you've lost your internet connection. Some features may
        not work properly.
      </p>

      <div className="space-y-2 w-full max-w-xs">
        <Button onClick={handleRetry} disabled={isChecking} className="w-full">
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
          <p className="text-xs text-muted-foreground mt-2">
            Attempt {retryCount} - Still offline
          </p>
        )}
      </div>
    </div>
  );
};

export default OfflineDetector;
