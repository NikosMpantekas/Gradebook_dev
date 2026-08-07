import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { API_URL } from "../config/appConfig";
import Maintenance from "./Maintenance";

// Route-level wrapper that blocks access during maintenance for non-superadmin
// logged-in users and renders the full Maintenance screen instead.
export const MaintenanceStatusChecker = ({ children }) => {
  const location = useLocation();
  const { user: authUser } = useSelector((state) => state.auth);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback to local/session storage if redux hasn't populated yet
  const user =
    authUser ||
    JSON.parse(
      localStorage.getItem("user") ||
        sessionStorage.getItem("user") ||
        "null",
    );

  useEffect(() => {
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const checkMaintenanceStatus = async () => {
    try {
      // POST-LOGIN CHECK: Only check maintenance for logged-in users
      if (!user) {
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      // SUPERADMIN BYPASS: Always allow superadmin users to access the system
      if (user?.role === "superadmin") {
        setIsMaintenanceMode(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/system/maintenance/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();

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

  if (isMaintenanceMode && !isLoading && !isPublicRoute) {
    return <Maintenance />;
  }

  return <>{children}</>;
};

export default MaintenanceStatusChecker;
