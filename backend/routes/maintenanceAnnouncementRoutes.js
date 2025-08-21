const express = require('express');
const router = express.Router();
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementById
} = require('../controllers/maintenanceAnnouncementController');

const { protect, superadmin } = require('../middleware/authMiddleware');

// @route   GET /api/maintenance-announcements/active
// @desc    Get active maintenance announcements for current user's role
// @access  Private (all authenticated users)
router.get('/active', protect, getActiveAnnouncements);

// @route   GET /api/maintenance-announcements
// @desc    Get all maintenance announcements (management view)
// @access  Private/SuperAdmin
router.get('/', protect, superadmin, getAllAnnouncements);

// @route   POST /api/maintenance-announcements
// @desc    Create new maintenance announcement
// @access  Private/SuperAdmin
router.post('/', protect, superadmin, createAnnouncement);

// @route   GET /api/maintenance-announcements/:id
// @desc    Get single maintenance announcement by ID
// @access  Private/SuperAdmin
router.get('/:id', protect, superadmin, getAnnouncementById);

// @route   PUT /api/maintenance-announcements/:id
// @desc    Update maintenance announcement
// @access  Private/SuperAdmin
router.put('/:id', protect, superadmin, updateAnnouncement);

// @route   DELETE /api/maintenance-announcements/:id
// @desc    Delete maintenance announcement
// @access  Private/SuperAdmin
router.delete('/:id', protect, superadmin, deleteAnnouncement);

module.exports = router;
