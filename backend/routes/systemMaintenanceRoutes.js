const express = require('express');
const router = express.Router();
const {
  getMaintenanceStatus,
  getMaintenanceDetails,
  updateMaintenanceMode,
  getMaintenanceHistory,
  clearMaintenanceHistory
} = require('../controllers/systemMaintenanceController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// @desc    Get current maintenance status (public)
// @route   GET /api/system/maintenance/status
// @access  Public
router.get('/status', getMaintenanceStatus);

// @desc    Get full maintenance details (SuperAdmin only)
// @route   GET /api/system/maintenance
// @access  Private/SuperAdmin
router.get('/', protect, superAdmin, getMaintenanceDetails);

// @desc    Update maintenance mode (SuperAdmin only)
// @route   PUT /api/system/maintenance
// @access  Private/SuperAdmin
router.put('/', protect, superAdmin, updateMaintenanceMode);

// @desc    Get maintenance history (SuperAdmin only)
// @route   GET /api/system/maintenance/history
// @access  Private/SuperAdmin
router.get('/history', protect, superAdmin, getMaintenanceHistory);

// @desc    Clear maintenance history (SuperAdmin only)
// @route   DELETE /api/system/maintenance/history
// @access  Private/SuperAdmin
router.delete('/history', protect, superAdmin, clearMaintenanceHistory);

module.exports = router;
