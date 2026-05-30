const asyncHandler = require("express-async-handler");
const SystemMaintenance = require("../models/systemMaintenanceModel");

/**
 * Middleware to check and enforce system-wide maintenance mode.
 * Allows requests to proceed if maintenance is off, or if user has bypass permissions.
 */
const checkMaintenanceMode = asyncHandler(async (req, res, next) => {
  try {
    const skipMaintenanceRoutes = [
      "/api/system/maintenance/status",
      "/api/users/login",
      "/api/users/refresh-token",
      "/api/patch-notes/public"
    ];

    if (skipMaintenanceRoutes.some((route) => req.originalUrl.includes(route))) {
      return next();
    }

    const maintenanceDoc = await SystemMaintenance.getCurrentStatus();

    if (!maintenanceDoc.isMaintenanceMode) {
      return next();
    }

    if (req.user && maintenanceDoc.canBypassMaintenance(req.user.role)) {
      console.log(`[MAINTENANCE] User ${req.user.role} can bypass maintenance - allowing request`);
      return next();
    }

    console.log(`[MAINTENANCE] Blocking request - maintenance mode active and user cannot bypass`, {
      userRole: req.user?.role || "anonymous",
      path: req.originalUrl
    });

    res.status(503).json({
      success: false,
      message: "System is currently under maintenance",
      isMaintenanceMode: true,
      maintenanceMessage: maintenanceDoc.maintenanceMessage,
      estimatedCompletion: maintenanceDoc.estimatedCompletion,
      error: "Service temporarily unavailable"
    });
  } catch (error) {
    console.error("[MAINTENANCE] Error checking maintenance status - failing closed:", error);
    res.status(503).json({
      success: false,
      message: "Unable to verify system status",
      error: "Service temporarily unavailable"
    });
  }
});

module.exports = { checkMaintenanceMode };
