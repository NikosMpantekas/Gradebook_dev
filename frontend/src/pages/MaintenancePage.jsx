import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_URL } from "../config/appConfig";
import Maintenance from "./Maintenance";

// Route-level wrapper that blocks access during maintenance for non-superadmin
// logged-in users and renders the full Maintenance screen instead.
export const MaintenanceStatusChecker = ({ children }) => {
  const location = useLocation();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Read user once on mount (auth state doesn't change mid-session here)
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      console.log("[MAINTENANCE CHECKER] Checking maintenance status");
      console.log(
        "[MAINTENANCE CHECKER] Current user:",
        user?.role || "Not logged in",
      );

      // POST-LOGIN CHECK: Only check maintenance for logged-in users
      if (!user) {
        console.log(
          "[MAINTENANCE CHECKER] No user logged in - allowing access to /home and /login",
        );
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      // SUPERADMIN BYPASS: Always allow superadmin users to access the system
      if (user?.role === "superadmin") {
        console.log(
          "[MAINTENANCE CHECKER] Superadmin detected - bypassing maintenance mode",
        );
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/system/maintenance/status`);

      if (!response.ok) {
        console.log(
          "[MAINTENANCE CHECKER] HTTP error:",
          response.status,
          response.statusText,
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.log(
          "[MAINTENANCE CHECKER] Response is not JSON, content-type:",
          contentType,
        );
        throw new Error("Response is not JSON");
      }

      const data = await response.json();

      console.log("[MAINTENANCE CHECKER] Status response:", {
        isMaintenanceMode: data.isMaintenanceMode,
        canBypass: data.canBypass,
        userRole: user?.role,
      });

      // Show maintenance page if maintenance is enabled and user cannot bypass
      setIsMaintenanceMode(data.isMaintenanceMode && !data.canBypass);
    } catch (error) {
      console.error(
        "[MAINTENANCE CHECKER] Error checking maintenance status:",
        error,
      );
      // Don't show maintenance page on API errors - fail safely
      setIsMaintenanceMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current path is a public route that should be accessible during maintenance
  const publicRoutes = [
    "/home",
    "/about",
    "/contact",
    "/login",
    "/maintenance",
    "/change-password",
  ];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  console.log("[MAINTENANCE CHECKER] Render decision:", {
    pathname: location.pathname,
    isPublicRoute,
    isMaintenanceMode,
    isLoading,
    willShowMaintenance: isMaintenanceMode && !isLoading && !isPublicRoute,
  });

  if (isMaintenanceMode && !isLoading && !isPublicRoute) {
    return <Maintenance />;
  }

  return <>{children}</>;
};

export default MaintenanceStatusChecker;
