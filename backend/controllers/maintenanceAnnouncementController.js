const asyncHandler = require('express-async-handler');
const MaintenanceAnnouncement = require('../models/maintenanceAnnouncementModel');

// @desc    Get active maintenance announcements for dashboard
// @route   GET /api/maintenance-announcements/active
// @access  Private
const getActiveAnnouncements = asyncHandler(async (req, res) => {
  try {
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Getting active announcements for user role: ${req.user.role}`);

    const announcements = await MaintenanceAnnouncement.getActiveAnnouncements(req.user.role);

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Found ${announcements.length} active announcements`);
    res.json(announcements);
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error getting active announcements:', error);
    res.status(500);
    throw new Error('Failed to get active maintenance announcements');
  }
});

// @desc    Get all maintenance announcements (SuperAdmin only)
// @route   GET /api/maintenance-announcements
// @access  Private/SuperAdmin
const getAllAnnouncements = asyncHandler(async (req, res) => {
  try {
    console.log(`[MAINTENANCE_ANNOUNCEMENTS] SuperAdmin ${req.user._id} requesting all announcements`);

    const announcements = await MaintenanceAnnouncement.getAllAnnouncements();

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Retrieved ${announcements.length} total announcements`);
    res.json(announcements);
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error getting all announcements:', error);
    res.status(500);
    throw new Error('Failed to get maintenance announcements');
  }
});

// @desc    Create new maintenance announcement (SuperAdmin only)
// @route   POST /api/maintenance-announcements
// @access  Private/SuperAdmin
const createAnnouncement = asyncHandler(async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      scheduledStart,
      scheduledEnd,
      targetRoles,
      affectedServices,
      showOnDashboard
    } = req.body;

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] SuperAdmin ${req.user._id} creating new announcement:`, {
      title,
      type,
      scheduledStart,
      scheduledEnd
    });

    // Validation
    if (!title || !message || !scheduledStart || !scheduledEnd) {
      res.status(400);
      throw new Error('Title, message, scheduled start, and scheduled end are required');
    }

    const startDate = new Date(scheduledStart);
    const endDate = new Date(scheduledEnd);

    if (startDate >= endDate) {
      res.status(400);
      throw new Error('Scheduled end time must be after start time');
    }

    // Create announcement
    const announcement = await MaintenanceAnnouncement.create({
      title: title.trim(),
      message: message.trim(),
      type: type || 'info',
      scheduledStart: startDate,
      scheduledEnd: endDate,
      targetRoles: targetRoles || ['admin', 'teacher', 'student', 'parent', 'secretary'],
      affectedServices: affectedServices || [],
      showOnDashboard: showOnDashboard !== undefined ? showOnDashboard : true,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    });

    // Add creation to history
    announcement.addHistory('created', req.user._id, 'Announcement created');
    await announcement.save();

    // Populate for response
    await announcement.populate('createdBy', 'name role email');
    await announcement.populate('lastModifiedBy', 'name role email');

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Announcement created successfully with ID: ${announcement._id}`);

    res.status(201).json({
      message: 'Maintenance announcement created successfully',
      announcement
    });
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error creating announcement:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to create maintenance announcement');
  }
});

// @desc    Update maintenance announcement (SuperAdmin only)
// @route   PUT /api/maintenance-announcements/:id
// @access  Private/SuperAdmin
const updateAnnouncement = asyncHandler(async (req, res) => {
  try {
    const announcementId = req.params.id;
    const {
      title,
      message,
      type,
      scheduledStart,
      scheduledEnd,
      targetRoles,
      affectedServices,
      showOnDashboard,
      isActive
    } = req.body;

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] SuperAdmin ${req.user._id} updating announcement ${announcementId}`);

    const announcement = await MaintenanceAnnouncement.findById(announcementId);
    if (!announcement) {
      res.status(404);
      throw new Error('Maintenance announcement not found');
    }

    // Store changes for history
    const changes = [];

    if (title !== undefined && title !== announcement.title) {
      announcement.title = title.trim();
      changes.push('title');
    }

    if (message !== undefined && message !== announcement.message) {
      announcement.message = message.trim();
      changes.push('message');
    }

    if (type !== undefined && type !== announcement.type) {
      announcement.type = type;
      changes.push('type');
    }

    if (scheduledStart !== undefined) {
      const startDate = new Date(scheduledStart);
      if (startDate.getTime() !== announcement.scheduledStart.getTime()) {
        announcement.scheduledStart = startDate;
        changes.push('scheduledStart');
      }
    }

    if (scheduledEnd !== undefined) {
      const endDate = new Date(scheduledEnd);
      if (endDate.getTime() !== announcement.scheduledEnd.getTime()) {
        announcement.scheduledEnd = endDate;
        changes.push('scheduledEnd');
      }
    }

    if (targetRoles !== undefined) {
      announcement.targetRoles = targetRoles;
      changes.push('targetRoles');
    }

    if (affectedServices !== undefined) {
      announcement.affectedServices = affectedServices;
      changes.push('affectedServices');
    }

    if (showOnDashboard !== undefined && showOnDashboard !== announcement.showOnDashboard) {
      announcement.showOnDashboard = showOnDashboard;
      changes.push('showOnDashboard');
    }

    if (isActive !== undefined && isActive !== announcement.isActive) {
      announcement.isActive = isActive;
      changes.push('isActive');
    }

    // Validate dates
    if (announcement.scheduledStart >= announcement.scheduledEnd) {
      res.status(400);
      throw new Error('Scheduled end time must be after start time');
    }

    announcement.lastModifiedBy = req.user._id;

    // Add update to history
    const action = changes.includes('isActive') ?
      (announcement.isActive ? 'activated' : 'deactivated') : 'updated';
    announcement.addHistory(action, req.user._id, `Updated: ${changes.join(', ')}`);

    await announcement.save();

    // Populate for response
    await announcement.populate('createdBy', 'name role email');
    await announcement.populate('lastModifiedBy', 'name role email');

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Announcement updated successfully`);

    res.json({
      message: 'Maintenance announcement updated successfully',
      announcement
    });
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error updating announcement:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to update maintenance announcement');
  }
});

// @desc    Delete maintenance announcement (SuperAdmin only)
// @route   DELETE /api/maintenance-announcements/:id
// @access  Private/SuperAdmin
const deleteAnnouncement = asyncHandler(async (req, res) => {
  try {
    const announcementId = req.params.id;

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] SuperAdmin ${req.user._id} deleting announcement ${announcementId}`);

    const announcement = await MaintenanceAnnouncement.findById(announcementId);
    if (!announcement) {
      res.status(404);
      throw new Error('Maintenance announcement not found');
    }

    await MaintenanceAnnouncement.findByIdAndDelete(announcementId);

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Announcement deleted successfully`);

    res.json({
      message: 'Maintenance announcement deleted successfully'
    });
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error deleting announcement:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to delete maintenance announcement');
  }
});

// @desc    Get single maintenance announcement (SuperAdmin only)
// @route   GET /api/maintenance-announcements/:id
// @access  Private/SuperAdmin
const getAnnouncementById = asyncHandler(async (req, res) => {
  try {
    const announcementId = req.params.id;

    console.log(`[MAINTENANCE_ANNOUNCEMENTS] Getting announcement ${announcementId}`);

    const announcement = await MaintenanceAnnouncement.findById(announcementId)
      .populate('createdBy', 'name role email')
      .populate('lastModifiedBy', 'name role email')
      .populate('history.modifiedBy', 'name role');

    if (!announcement) {
      res.status(404);
      throw new Error('Maintenance announcement not found');
    }

    res.json(announcement);
  } catch (error) {
    console.error('[MAINTENANCE_ANNOUNCEMENTS] Error getting announcement:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to get maintenance announcement');
  }
});

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementById
};
