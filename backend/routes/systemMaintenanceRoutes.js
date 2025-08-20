const express = require('express');
const router = express.Router();
const {
  getMaintenanceStatus,
  getMaintenanceDetails,
  updateMaintenanceMode,
  getMaintenanceHistory,
  clearMaintenanceHistory
} = require('../controllers/systemMaintenanceController');
const { protect, superadmin } = require('../middleware/authMiddleware');

// Debug middleware to log all maintenance route requests
router.use((req, res, next) => {
  console.log(`[MAINTENANCE ROUTES] ${req.method} ${req.originalUrl} - Full path: ${req.baseUrl}${req.path}`);
  console.log(`[MAINTENANCE ROUTES] User authenticated: ${!!req.user}, Role: ${req.user?.role}`);
  next();
});

// @desc    Get current maintenance status (public)
// @route   GET /api/system/maintenance/status
// @access  Public
router.get('/status', getMaintenanceStatus);

// @desc    Get full maintenance details (SuperAdmin only)
// @route   GET /api/system/maintenance
// @access  Private/SuperAdmin
router.get('/', protect, superadmin, getMaintenanceDetails);

// @desc    Update maintenance mode (SuperAdmin only)
// @route   PUT /api/system/maintenance
// @access  Private/SuperAdmin
router.put('/', protect, superadmin, updateMaintenanceMode);

// @desc    Get maintenance history (SuperAdmin only)
// @route   GET /api/system/maintenance/history
// @access  Private/SuperAdmin
router.get('/history', protect, superadmin, getMaintenanceHistory);

// @desc    Clear maintenance history (SuperAdmin only)
// @route   DELETE /api/system/maintenance/history
// @access  Private/SuperAdmin
router.delete('/history', protect, superadmin, clearMaintenanceHistory);

module.exports = router;
