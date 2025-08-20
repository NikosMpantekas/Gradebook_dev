import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, Clock, Wrench, RefreshCw } from 'lucide-react';

const MaintenancePage = () => {
  const [maintenanceData, setMaintenanceData] = useState({
    isMaintenanceMode: true,
    maintenanceMessage: 'The system is currently under maintenance. Please be patient while we work to improve your experience.',
    estimatedCompletion: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      console.log('[MAINTENANCE PAGE] Fetching maintenance status');
      const response = await fetch('/api/system/maintenance/status');
      const data = await response.json();
      console.log('[MAINTENANCE PAGE] Maintenance status:', data);
      setMaintenanceData(data);
    } catch (error) {
      console.error('[MAINTENANCE PAGE] Error fetching maintenance status:', error);
      // Use default maintenance message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const formatEstimatedTime = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      if (date <= now) return 'Soon';
      
      const diffMs = date - now;
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) return 'Within the hour';
      if (diffHours === 1) return 'In about 1 hour';
      if (diffHours < 24) return `In about ${diffHours} hours`;
      
      const diffDays = Math.ceil(diffHours / 24);
      if (diffDays === 1) return 'Tomorrow';
      return `In ${diffDays} days`;
    } catch (error) {
      console.error('Error formatting estimated time:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Checking system status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Icon and Title */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <Wrench className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              System Maintenance
            </h1>
            <div className="flex items-center justify-center text-yellow-600 mb-4">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-medium">Service Temporarily Unavailable</span>
            </div>
          </div>

          {/* Maintenance Message */}
          <div className="mb-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              {maintenanceData.maintenanceMessage}
            </p>
            
            {/* Estimated Completion Time */}
            {maintenanceData.estimatedCompletion && (
              <div className="inline-flex items-center bg-blue-50 rounded-lg px-4 py-2 text-blue-800 border border-blue-200">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  Expected completion: {formatEstimatedTime(maintenanceData.estimatedCompletion)}
                </span>
              </div>
            )}
          </div>

          {/* What's happening section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">What's happening?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                We're performing important system updates and improvements
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Database optimization and security enhancements are in progress
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Your data is safe and will be available once maintenance is complete
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button 
              onClick={handleRefresh}
              className="w-full sm:w-auto px-8"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Checking...' : 'Check Again'}
            </Button>
            
            <div className="text-sm text-gray-500">
              <p>Page will automatically refresh in a few moments</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Thank you for your patience. We'll be back online shortly.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              If you have urgent questions, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Auto-refresh component to periodically check maintenance status
export const MaintenanceStatusChecker = ({ children }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceStatus();
    
    // Check maintenance status every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      console.log('[MAINTENANCE CHECKER] Checking maintenance status');
      const response = await fetch('/api/system/maintenance/status');
      const data = await response.json();
      
      console.log('[MAINTENANCE CHECKER] Status response:', {
        isMaintenanceMode: data.isMaintenanceMode,
        canBypass: data.canBypass
      });
      
      // Show maintenance page if maintenance is enabled and user cannot bypass
      setIsMaintenanceMode(data.isMaintenanceMode && !data.canBypass);
    } catch (error) {
      console.error('[MAINTENANCE CHECKER] Error checking maintenance status:', error);
      // Don't show maintenance page on API errors
      setIsMaintenanceMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isMaintenanceMode) {
    return <MaintenancePage />;
  }

  return children;
};

export default MaintenancePage;
