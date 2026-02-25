import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AlertTriangle, Clock, Wrench, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/appConfig';
import Maintenance from './Maintenance';

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
      <div className="w-full max-w-md space-y-6">
        {/* Simple Maintenance Message */}
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
                <p className="text-gray-600 leading-relaxed">
                  {maintenanceData.maintenanceMessage || 'We are currently performing scheduled maintenance to improve your experience. Please check back shortly.'}
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
            </div>
          </CardContent>
        </Card>

        {/* Simple Action Button */}
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
  const location = useLocation();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user from Redux to check if superadmin
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    checkMaintenanceStatus();

    // Check maintenance status every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      console.log('[MAINTENANCE CHECKER] Checking maintenance status');
      console.log('[MAINTENANCE CHECKER] Current user:', user?.role || 'Not logged in');

      // POST-LOGIN CHECK: Only check maintenance for logged-in users
      if (!user) {
        console.log('[MAINTENANCE CHECKER] No user logged in - allowing access to /home and /login');
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      // SUPERADMIN BYPASS: Always allow superadmin users to access the system
      if (user?.role === 'superadmin') {
        console.log('[MAINTENANCE CHECKER] Superadmin detected - bypassing maintenance mode');
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

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
        canBypass: data.canBypass,
        userRole: user?.role
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

  // Check if current path is a public route that should be accessible during maintenance
  const publicRoutes = [
    '/home',
    '/about',
    '/contact',
    '/login',
    '/register',
    '/maintenance',
    '/diagnostics',
    '/change-password'
  ];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  console.log('[MAINTENANCE CHECKER] Render decision:', {
    pathname: location.pathname,
    isPublicRoute,
    isMaintenanceMode,
    isLoading,
    willShowMaintenance: isMaintenanceMode && !isLoading && !isPublicRoute
  });

  if (isMaintenanceMode && !isLoading && !isPublicRoute) {
    // Show the Greek maintenance page for protected routes
    return <Maintenance />;
  }

  return children;
};

export default MaintenancePage;
