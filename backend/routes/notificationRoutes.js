const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const {
  createNotification,
  getAllNotifications,
  getSentNotifications,
  markNotificationRead,
  markNotificationSeen,
  getNotificationById,
  deleteNotification
} = require('../controllers/notificationController');

// Import the modern push controller
const {
  getVapidPublicKey,
  createPushSubscription,
  deletePushSubscription,
  sendTestPush,
  getUserSubscriptions
} = require('../controllers/pushController');
const { protect, admin, teacher, canSendNotifications } = require('../middleware/authMiddleware');

// Modern push notification endpoints
router.get('/vapid', protect, getVapidPublicKey);
router.get('/vapid-public-key', protect, getVapidPublicKey);
router.post('/subscription', protect, createPushSubscription);
router.delete('/subscription', protect, deletePushSubscription);
router.get('/subscriptions', protect, getUserSubscriptions);
router.post('/test', protect, sendTestPush);

// Protected routes - all authenticated users can access their own notifications
router.get('/sent', protect, canSendNotifications, getSentNotifications);
router.get('/:id', protect, getNotificationById);
router.put('/:id/read', protect, markNotificationRead);
router.put('/:id/seen', protect, markNotificationSeen);

// Create notification - teachers and admins only
router.post('/', protect, canSendNotifications, createNotification);

// Update notification route - teachers and admins only
router.put('/:id', protect, canSendNotifications, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const { title, message, isImportant } = req.body;
    
    // Find the notification
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }
    
    // Update the notification
    notification.title = title || notification.title;
    notification.message = message || notification.message;
    notification.isImportant = isImportant !== undefined ? isImportant : notification.isImportant;
    
    const updatedNotification = await notification.save();
    
    res.status(200).json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Error updating notification');
  }
});

// Delete notification route - teachers and admins only
router.delete('/:id', protect, canSendNotifications, deleteNotification);


// Get all notifications - all authenticated users can view
router.get('/', protect, getAllNotifications);

module.exports = router;
