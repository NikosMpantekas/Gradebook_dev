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
  deleteNotification,
  createPushSubscription
} = require('../controllers/notificationController');

// Import the separate VAPID controller
const {
  getVapidPublicKey
} = require('../controllers/vapidController');
const { protect, admin, teacher, canSendNotifications } = require('../middleware/authMiddleware');

// Protected routes - all authenticated users can access their own notifications
// VAPID endpoints before /:id route to prevent conflicts
router.get('/vapid', protect, getVapidPublicKey);
router.get('/vapid-public-key', protect, getVapidPublicKey);
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

// Push notification subscription endpoints - all authenticated users
router.post('/subscription', protect, createPushSubscription);

// Test push notification endpoint
router.post('/test-push', protect, async (req, res) => {
  try {
    const webpush = require('web-push');
    const Subscription = mongoose.model('Subscription');
    
    // Get user subscriptions
    const subscriptions = await Subscription.find({ user: req.user._id });
    
    if (subscriptions.length === 0) {
      return res.status(400).json({ success: false, message: 'No push subscriptions found' });
    }
    
    console.log(`[TEST PUSH] Sending test notification to ${subscriptions.length} subscriptions for user ${req.user._id}`);
    
    const payload = JSON.stringify({
      title: 'GradeBook Test',
      body: 'Test push notification - this means it\'s working!',
      icon: '/logo192.png',
      url: '/app/notifications',
      notificationId: 'test-' + Date.now()
    });
    
    let successCount = 0;
    let failureCount = 0;
    
    // Send to all user subscriptions
    for (const subscription of subscriptions) {
      try {
        console.log(`[TEST PUSH] Sending to subscription ${subscription._id}`);
        await webpush.sendNotification(subscription.subscription, payload);
        successCount++;
        console.log(`[TEST PUSH] SUCCESS for subscription ${subscription._id}`);
      } catch (error) {
        failureCount++;
        console.error(`[TEST PUSH] FAILED for subscription ${subscription._id}:`, error.message);
      }
    }
    
    console.log(`[TEST PUSH] Test completed: ${successCount} success, ${failureCount} failures`);
    
    res.json({
      success: true,
      message: `Test push sent to ${successCount} devices`,
      stats: { successCount, failureCount, total: subscriptions.length }
    });
    
  } catch (error) {
    console.error('[TEST PUSH] Error sending test push:', error);
    res.status(500).json({ success: false, message: 'Failed to send test push' });
  }
});

// Add DELETE routes for both endpoint names to handle frontend variations
router.delete('/subscription', protect, async (req, res) => {
  try {
    console.log(`Deleting push subscription for user ${req.user._id}`);
    
    // Find and remove subscriptions for this user
    const Subscription = mongoose.model('Subscription');
    const result = await Subscription.deleteMany({ user: req.user._id });
    
    console.log(`Deleted ${result.deletedCount} subscriptions for user ${req.user._id}`);
    
    res.status(200).json({
      success: true,
      message: `Successfully unsubscribed from push notifications`
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500);
    throw new Error('Failed to remove push subscription: ' + error.message);
  }
});

// Alternative DELETE route for frontend calling /push-subscription
router.delete('/push-subscription', protect, async (req, res) => {
  try {
    console.log(`Deleting push subscription for user ${req.user._id} via /push-subscription endpoint`);
    
    // Find and remove subscriptions for this user
    const Subscription = mongoose.model('Subscription');
    const result = await Subscription.deleteMany({ user: req.user._id });
    
    console.log(`Deleted ${result.deletedCount} subscriptions for user ${req.user._id}`);
    
    res.status(200).json({
      success: true,
      message: `Successfully unsubscribed from push notifications`
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500);
    throw new Error('Failed to remove push subscription: ' + error.message);
  }
});

// Get all notifications - all authenticated users can view
router.get('/', protect, getAllNotifications);

module.exports = router;
