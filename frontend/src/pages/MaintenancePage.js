import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, Clock, Wrench, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/appConfig';

const MaintenancePage = () => {
  const [maintenanceData, setMaintenanceData] = useState({
    isMaintenanceMode: true,
    maintenanceMessage: 'The system is currently under maintenance. Please be patient while we work to improve your experience.',
    estimatedCompletion: null,
    allowedRoles: [],
    canBypass: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      console.log('[MAINTENANCE PAGE] Fetching maintenance status');
      const response = await fetch(`${API_URL}/api/system/maintenance/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }
      
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
      
      if (diffHours < 1) return 'Less than 1 hour';
      if (diffHours === 1) return '1 hour';
      if (diffHours < 24) return `${diffHours} hours`;
      
      const diffDays = Math.ceil(diffHours / 24);
      if (diffDays === 1) return '1 day';
      return `${diffDays} days`;
    } catch (error) {
      return 'Soon';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
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
      <div className="w-full max-w-4xl space-y-6">
        {/* Header Section */}
        <Card className="shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-orange-100 p-4 rounded-full">
                  <Wrench className="h-12 w-12 text-orange-600" />
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  System Under Maintenance
                </h1>
                <p className="text-gray-600 leading-relaxed max-w-md mx-auto">
                  {maintenanceData.maintenanceMessage || 'The system is currently under maintenance. Please be patient while we work to improve your experience.'}
                </p>
              </div>

              {maintenanceData.estimatedCompletion && (
                <div className="inline-flex items-center bg-blue-50 rounded-lg px-4 py-2 text-blue-800 border border-blue-200">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    Expected completion: {formatEstimatedTime(maintenanceData.estimatedCompletion)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Controls Information */}
        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">
              Maintenance Controls
            </h2>
            
            {/* Disable Maintenance Mode Info */}
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
              <h3 className="font-medium text-red-800 mb-2">Disable Maintenance Mode</h3>
              <p className="text-red-700 text-sm">
                Turn off maintenance mode to allow users back into the system
              </p>
            </div>

            {/* Maintenance Message */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Maintenance Message</h3>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-gray-700">
                  {maintenanceData.maintenanceMessage || 'The system is currently under maintenance. Please be patient while we work to improve your experience.'}
                </p>
              </div>
            </div>

            {/* Estimated Completion */}
            {maintenanceData.estimatedCompletion && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Estimated Completion Time (Optional)</h3>
                <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                  <p className="text-blue-700 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatEstimatedTime(maintenanceData.estimatedCompletion)}
                  </p>
                </div>
              </div>
            )}

            {/* Roles Allowed During Maintenance */}
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Roles Allowed During Maintenance</h3>
              <div className="grid grid-cols-2 gap-3">
                {['admin', 'teacher', 'student', 'parent'].map(role => (
                  <div key={role} className="flex items-center p-3 bg-gray-50 rounded-lg border">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      maintenanceData.allowedRoles?.includes(role) ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="capitalize font-medium text-gray-700">{role}s</span>
                    <span className={`ml-auto text-xs px-2 py-1 rounded ${
                      maintenanceData.allowedRoles?.includes(role) 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {maintenanceData.allowedRoles?.includes(role) ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                SuperAdmins always have access during maintenance
              </p>
            </div>

            {/* Reason for Change */}
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
              <h3 className="font-medium text-yellow-800 mb-2">Reason for Change *</h3>
              <p className="text-yellow-700 text-sm">
                A reason is required for maintenance actions for audit purposes
              </p>
            </div>

            {/* User Bypass Status */}
            {maintenanceData.canBypass && (
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <p className="text-green-700 font-medium">
                  ✓ Your account has been granted access during maintenance
                </p>
                <p className="text-green-600 text-sm mt-1">
                  You may continue using the system with limited functionality.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="text-center">
          <Button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </>
            )}
          </Button>
        </div>
      </div>
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
      const response = await fetch(`${API_URL}/api/system/maintenance/status`);
      
      if (!response.ok) {
        console.log('[MAINTENANCE CHECKER] HTTP error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('[MAINTENANCE CHECKER] Response is not JSON, content-type:', contentType);
        throw new Error('Response is not JSON');
      }
      
      const data = await response.json();
      
      console.log('[MAINTENANCE CHECKER] Status response:', {
        isMaintenanceMode: data.isMaintenanceMode,
        canBypass: data.canBypass
      });
      
      // Show maintenance page if maintenance is enabled and user cannot bypass
      setIsMaintenanceMode(data.isMaintenanceMode && !data.canBypass);
    } catch (error) {
      console.error('[MAINTENANCE CHECKER] Error checking maintenance status:', error);
      // Don't show maintenance page on API errors - fail safely
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
