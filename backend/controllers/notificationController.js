const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const PushSubscription = require('../models/pushSubscriptionModel');
const { pushService } = require('./pushController');

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Teacher Admin
const createNotification = asyncHandler(async (req, res) => {
  const { 
    title, 
    message, 
    recipients, 
    classes,
    schoolBranches,
    targetRole, 
    urgent,
    expiresAt,
    sendToAll
  } = req.body;

  console.log('NOTIFICATION_CREATE', `Creating notification for user ${req.user._id} (${req.user.role}) in school ${req.user.schoolId}`);
  console.log('NOTIFICATION_CREATE', 'Request payload:', {
    title: title?.substring(0, 50) + '...',
    messageLength: message?.length,
    recipientsCount: recipients?.length || 0,
    classesCount: classes?.length || 0,
    schoolBranchesCount: schoolBranches?.length || 0,
    targetRole,
    sendToAll,
    urgent
  });

  if (!title || !message) {
    console.log('NOTIFICATION_CREATE', 'Validation failed: Missing title or message');
    res.status(400);
    throw new Error('Please provide both title and message');
  }

  if (!sendToAll && (!recipients || recipients.length === 0) && 
      (!classes || classes.length === 0) && 
      (!schoolBranches || schoolBranches.length === 0) && 
      !targetRole) {
    console.log('NOTIFICATION_CREATE', 'Validation failed: No recipients specified');
    res.status(400);
    throw new Error('Please specify at least one recipient, class, school branch, or target role');
  }

  try {
    console.log('NOTIFICATION_CREATE', '🔧 CODE FIX ACTIVE - Recipients will be processed after creation');
    
    // Create notification with new class-based structure - recipients will be populated after processing
    const notificationData = {
      title,
      message,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      recipients: [], // FIXED: Initialize empty, populate after processing
      classes: classes || [],
      schoolBranches: schoolBranches || [],
      targetRole: targetRole || 'all',
      schoolId: req.user.schoolId,
      urgent: urgent || false,
      expiresAt: expiresAt || null,
      sendToAll: sendToAll || false,
      status: 'sent'
    };
    
    console.log('NOTIFICATION_CREATE', '✅ Recipients initialized as empty array for proper processing');

    console.log('NOTIFICATION_CREATE', 'Creating notification with data:', {
      ...notificationData,
      message: message.substring(0, 100) + '...',
      recipients: `[${recipients?.length || 0} recipients - will be processed after creation]`
    });

    const newNotification = await Notification.create(notificationData);
    console.log('NOTIFICATION_CREATE', 'Notification created with ID:', newNotification._id);
    console.log('NOTIFICATION_CREATE', '🚀 RECIPIENTS PROCESSING STARTING - Raw frontend data will be converted');

    // CRITICAL SECURITY: Validate sender permissions before determining recipients
    console.log(`[SECURITY] Validating sender permissions for ${req.user.role} creating notification with targetRole: ${targetRole}`);
    
    // SECURITY CHECK: Validate sender can target the specified role
    if (targetRole && targetRole !== 'all') {
      if (req.user.role === 'teacher' && targetRole === 'admin') {
        console.error(`[SECURITY] Teacher ${req.user._id} attempted to send notification to admin role - BLOCKED`);
        res.status(403);
        throw new Error('Teachers cannot send notifications to administrators');
      }
      if (req.user.role === 'student') {
        console.error(`[SECURITY] Student ${req.user._id} attempted to create notification - BLOCKED`);
        res.status(403);
        throw new Error('Students cannot create notifications');
      }
    }

    // Find all potential recipients with STRICT role-based filtering
    let potentialRecipients = [];
    
    if (sendToAll) {
      console.log(`[SECURITY] Processing sendToAll notification with role restrictions`);
      // SECURITY: Only admins can send to all users - teachers limited to students only
      let allowedRoles;
      if (req.user.role === 'admin') {
        allowedRoles = ['student', 'teacher', 'admin'];
      } else if (req.user.role === 'teacher') {
        allowedRoles = ['student']; // Teachers can only mass-notify students
        console.log('[SECURITY] Teacher sendToAll restricted to students only');
      } else {
        console.error(`[SECURITY] Unauthorized role ${req.user.role} attempted sendToAll - BLOCKED`);
        res.status(403);
        throw new Error('Unauthorized to send notifications to all users');
      }
      
      const allUsers = await User.find({ 
        schoolId: req.user.schoolId,
        role: { $in: allowedRoles }
      }).select('_id role');
      potentialRecipients = allUsers.map(user => user._id);
      console.log(`[SECURITY] SendToAll filtered to ${potentialRecipients.length} users with roles: ${allowedRoles.join(', ')}`);
    } else {
      // Get direct recipients if specified with STRICT role validation
      if (recipients && recipients.length > 0) {
        console.log(`[SECURITY] Validating ${recipients.length} direct recipients for sender role: ${req.user.role}`);
        
        // Extract recipient IDs from frontend format {type, id} or plain ObjectId
        const recipientIds = recipients.map(recipient => {
          if (typeof recipient === 'object' && recipient.id) {
            return recipient.id; // Frontend format: {type: 'student', id: 'xxx'}
          }
          return recipient; // Plain ObjectId format
        });
        
        console.log(`[SECURITY] Extracted ${recipientIds.length} recipient IDs:`, recipientIds);
        
        // SECURITY: Validate each recipient against sender permissions
        const recipientUsers = await User.find({
          _id: { $in: recipientIds },
          schoolId: req.user.schoolId
        }).select('_id role name');
        
        const validatedRecipients = [];
        for (const recipient of recipientUsers) {
          // SECURITY CHECK: Teachers cannot send directly to admins
          if (req.user.role === 'teacher' && recipient.role === 'admin') {
            console.error(`[SECURITY] Teacher ${req.user._id} attempted to send notification directly to admin ${recipient._id} (${recipient.name}) - BLOCKED`);
            res.status(403);
            throw new Error(`Teachers cannot send notifications directly to administrators (${recipient.name})`);
          }
          // SECURITY CHECK: Students cannot send notifications at all
          if (req.user.role === 'student') {
            console.error(`[SECURITY] Student ${req.user._id} attempted to send notification - BLOCKED`);
            res.status(403);
            throw new Error('Students cannot send notifications');
          }
          
          validatedRecipients.push(recipient._id);
          console.log(`[SECURITY] Recipient ${recipient._id} (${recipient.role}) validated for sender ${req.user.role}`);
        }
        
        potentialRecipients = [...potentialRecipients, ...validatedRecipients];
        console.log(`[SECURITY] Added ${validatedRecipients.length} validated direct recipients`);
      }

      // Get recipients based on classes with STRICT role validation
      if (classes && classes.length > 0) {
        console.log(`[SECURITY] Finding recipients from ${classes.length} classes for sender role: ${req.user.role}`);
        const Class = mongoose.model('Class');
        const classData = await Class.find({ 
          _id: { $in: classes },
          schoolId: req.user.schoolId
        }).populate('students teachers');
        
        classData.forEach(cls => {
          // SECURITY: Always include students if they exist (unless specifically excluded)
          if (cls.students && (targetRole === 'student' || targetRole === 'all' || !targetRole)) {
            potentialRecipients = [...potentialRecipients, ...cls.students.map(s => s._id)];
            console.log(`[SECURITY] Added ${cls.students.length} students from class ${cls.name || cls._id}`);
          }
          
          // SECURITY: Teachers can only be included if sender is admin or targeting teachers/all
          if (cls.teachers && cls.teachers.length > 0) {
            if (req.user.role === 'admin' && (targetRole === 'teacher' || targetRole === 'all')) {
              potentialRecipients = [...potentialRecipients, ...cls.teachers.map(t => t._id)];
              console.log(`[SECURITY] Admin added ${cls.teachers.length} teachers from class ${cls.name || cls._id}`);
            } else if (req.user.role === 'teacher' && (targetRole === 'teacher' || targetRole === 'all')) {
              // SECURITY: Teachers can notify other teachers in same class
              potentialRecipients = [...potentialRecipients, ...cls.teachers.map(t => t._id)];
              console.log(`[SECURITY] Teacher added ${cls.teachers.length} fellow teachers from class ${cls.name || cls._id}`);
            } else {
              console.log(`[SECURITY] Teachers excluded from class ${cls.name || cls._id} - sender: ${req.user.role}, targetRole: ${targetRole}`);
            }
          }
        });
      }

      // Get recipients based on school branches with STRICT role validation
      if (schoolBranches && schoolBranches.length > 0) {
        console.log(`[SECURITY] Finding recipients from ${schoolBranches.length} school branches for sender role: ${req.user.role}`);
        
        // SECURITY: Determine allowed roles based on sender permissions
        let allowedRoles = [];
        if (req.user.role === 'admin') {
          if (targetRole === 'all') {
            allowedRoles = ['student', 'teacher', 'admin'];
          } else {
            allowedRoles = [targetRole];
          }
        } else if (req.user.role === 'teacher') {
          // Teachers can only target students or other teachers (not admins)
          if (targetRole === 'admin') {
            console.error(`[SECURITY] Teacher ${req.user._id} attempted to target admin role via school branches - BLOCKED`);
            res.status(403);
            throw new Error('Teachers cannot send notifications to administrators');
          }
          allowedRoles = targetRole === 'all' ? ['student', 'teacher'] : [targetRole];
        } else {
          console.error(`[SECURITY] Unauthorized role ${req.user.role} attempted school branch notification - BLOCKED`);
          res.status(403);
          throw new Error('Unauthorized to send notifications via school branches');
        }
        
        const usersInBranches = await User.find({
          schoolId: req.user.schoolId,
          schoolBranch: { $in: schoolBranches },
          role: { $in: allowedRoles }
        }).select('_id role');
        
        potentialRecipients = [...potentialRecipients, ...usersInBranches.map(u => u._id)];
        console.log(`[SECURITY] Added ${usersInBranches.length} users from school branches with roles: ${allowedRoles.join(', ')}`);
      }

      // Get recipients based on target role only with STRICT validation
      if (targetRole && targetRole !== 'all' && (!classes || classes.length === 0) && (!schoolBranches || schoolBranches.length === 0)) {
        console.log(`[SECURITY] Finding recipients with target role: ${targetRole} for sender: ${req.user.role}`);
        
        // SECURITY: Validate sender can target this role
        if (req.user.role === 'teacher' && targetRole === 'admin') {
          console.error(`[SECURITY] Teacher ${req.user._id} attempted to target admin role - BLOCKED`);
          res.status(403);
          throw new Error('Teachers cannot send notifications to administrators');
        }
        if (req.user.role === 'student') {
          console.error(`[SECURITY] Student ${req.user._id} attempted to create notification - BLOCKED`);
          res.status(403);
          throw new Error('Students cannot create notifications');
        }
        
        const usersWithRole = await User.find({
          schoolId: req.user.schoolId,
          role: targetRole
        }).select('_id role');
        
        potentialRecipients = [...potentialRecipients, ...usersWithRole.map(u => u._id)];
        console.log(`[SECURITY] Added ${usersWithRole.length} users with target role: ${targetRole}`);
      }
    }

    // Remove duplicates and exclude sender
    const uniqueRecipients = [...new Set(potentialRecipients.map(id => id.toString()))]
      .filter(id => id !== req.user._id.toString())
      .map(id => new mongoose.Types.ObjectId(id));

    console.log('NOTIFICATION_CREATE', `Found ${uniqueRecipients.length} unique recipients`);

    // Update notification with final recipient list - convert to new structure
    const recipientObjects = uniqueRecipients.map(recipientId => ({
      user: recipientId,
      isRead: false,
      isSeen: false,
      readAt: null,
      seenAt: null
    }));
    
    newNotification.recipients = recipientObjects;
    newNotification.deliveryStats.totalRecipients = recipientObjects.length;
    newNotification.deliveryStats.read = 0;
    newNotification.deliveryStats.seen = 0;
    await newNotification.save();

    // SECURITY FIX: Find web push subscriptions for ONLY intended recipients
    console.log('[PUSH_SECURITY] Filtering push subscriptions for intended recipients only');
    
    // Filter users who have push notifications enabled
    const usersWithPushEnabled = await User.find({
      _id: { $in: uniqueRecipients },
      pushNotificationEnabled: true
    }).select('_id');
    
    const enabledUserIds = usersWithPushEnabled.map(user => user._id);
    console.log('[PUSH_SECURITY]', `Found ${enabledUserIds.length} users with push notifications enabled out of ${uniqueRecipients.length} total recipients`);
    console.log('[PUSH_SECURITY] Enabled user IDs:', enabledUserIds.map(id => id.toString()));
    
    // CRITICAL FIX: Use correct PushSubscription model and filter by actual recipients
    const subscriptions = await PushSubscription.find({
      userId: { $in: enabledUserIds },
      isActive: true
    });

    console.log('[PUSH_SECURITY]', `Found ${subscriptions.length} push subscriptions for intended recipients only`);
    console.log('[PUSH_SECURITY] Subscription user IDs:', subscriptions.map(sub => sub.userId.toString()));

    // Send push notifications (if web push is enabled)
    if (subscriptions.length > 0) {
      const webpush = require('web-push');
      
      const pushPromises = subscriptions.map(subscription => {
        console.log('[PUSH_SECURITY] Sending push to user:', subscription.userId.toString(), 'subscription:', subscription._id.toString());
        
        const payload = JSON.stringify({
          title: newNotification.title,
          body: newNotification.message.substring(0, 100),
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: {
            notificationId: newNotification._id.toString(),
            url: `/notifications/${newNotification._id}`
          }
        });

        return webpush.sendNotification(subscription, payload)
          .then(() => {
            console.log('[PUSH_SECURITY] Push notification SUCCESS for user:', subscription.userId.toString());
          })
          .catch(error => {
            console.error('[PUSH_SECURITY] Push notification FAILED for user:', subscription.userId.toString(), 'error:', error.message);
          });
      });

      await Promise.allSettled(pushPromises);
      console.log('NOTIFICATION_CREATE', 'Push notifications sent');
    }

    // Populate the response
    const populatedNotification = await Notification.findById(newNotification._id)
      .populate('recipients', 'name email role')
      .populate('classes', 'name schoolBranch direction subject')
      .populate('schoolBranches', 'name location');

    console.log('NOTIFICATION_CREATE', `Notification created successfully with ${uniqueRecipients.length} recipients`);
    res.status(201).json(populatedNotification);

  } catch (error) {
    console.error('NOTIFICATION_CREATE', `Error creating notification: ${error.message}`, {
      userId: req.user._id,
      schoolId: req.user.schoolId,
      stack: error.stack
    });
    res.status(500);
    throw new Error(`Failed to create notification: ${error.message}`);
  }
});

// @desc    Get all notifications for current user (unified endpoint)
// @route   GET /api/notifications
// @access  Private
const getAllNotifications = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    console.log('[NOTIFICATION] getAllNotifications endpoint called for user', user._id, `(${user.role})`);
    
    // Get limit from query params, default to 10
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    // Base query with schoolId filter for multi-tenancy
    const query = { schoolId: user.schoolId };
    
    // CRITICAL SECURITY: Apply STRICT role-based restrictions to prevent cross-role data leakage
    console.log(`[SECURITY] Applying strict role filtering for ${req.user.role} user ${req.user._id}`);
    
    if (req.user.role === 'student') {
      // STUDENTS: Can ONLY see notifications where they are direct recipients
      query['recipients.user'] = req.user._id;
      console.log(`[SECURITY] Student ${req.user._id} restricted to direct recipient notifications only`);
    }
    else if (req.user.role === 'teacher') {
      // TEACHERS: Can see notifications they sent OR where they are direct recipients
      query.$or = [
        { sender: req.user._id }, // Notifications they created
        { 'recipients.user': req.user._id } // Directly addressed to this teacher
      ];
      console.log(`[SECURITY] Teacher ${req.user._id} restricted to sent notifications and direct recipient notifications`);
    }
    else if (req.user.role === 'admin') {
      // ADMINS: Can see notifications they sent OR where they are direct recipients
      // This prevents "NO RECIPIENT FOUND" errors when admins view notifications they're not recipients of
      query.$or = [
        { sender: req.user._id }, // Notifications they created
        { 'recipients.user': req.user._id } // Directly addressed to this admin
      ];
      console.log(`[SECURITY] Admin ${req.user._id} restricted to sent notifications and direct recipient notifications`);
    }
    else if (req.user.role === 'parent') {
      // PARENTS: Can ONLY see notifications where they are direct recipients
      query['recipients.user'] = req.user._id;
      console.log(`[SECURITY] Parent ${req.user._id} restricted to direct recipient notifications only`);
    }
    else {
      // SECURITY: Unknown role - deny access
      console.error(`[SECURITY] Unknown user role: ${req.user.role} - denying access`);
      res.status(403);
      throw new Error('Access denied - invalid user role');
    }
    
    console.log('Notification query:', JSON.stringify(query));
    
    // Find notifications with appropriate filters
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name')
      .populate('recipients.user', 'name')
      .populate('schoolId', 'name')
      .populate('classes', 'name');
    
    console.log(`Found ${notifications.length} notifications`);
    
    // Compute isRead and isSeen for each notification for the current user
    const notificationsWithReadStatus = notifications.map(notification => {
      const notificationObj = notification.toObject();
      
      // Check if current user has read/seen this notification in recipients array
      // Handle both ObjectId and populated user objects
      const recipient = notification.recipients?.find(r => {
        if (!r.user) return false;
        
        // Handle populated user object (has _id property)
        if (r.user._id) {
          return r.user._id.toString() === user._id.toString();
        }
        
        // Handle ObjectId
        return r.user.toString() === user._id.toString();
      });
      
      // Debug logging for seen status extraction
      console.log(`NOTIFICATION_STATUS Processing notification ${notification._id}:`);
      console.log(`NOTIFICATION_STATUS - User ID: ${user._id.toString()}`);
      console.log(`NOTIFICATION_STATUS - Raw recipients:`, JSON.stringify(notification.recipients, null, 2));
      
      // Try different approaches to find recipient
      const attempts = [];
      
      notification.recipients?.forEach((r, index) => {
        if (r.user) {
          // Method 1: Direct ObjectId comparison
          const directMatch = r.user.toString() === user._id.toString();
          
          // Method 2: _id property comparison
          const idMatch = r.user._id ? r.user._id.toString() === user._id.toString() : false;
          
          attempts.push({
            index,
            userType: typeof r.user,
            userValue: r.user.toString(),
            hasIdProp: !!r.user._id,
            idValue: r.user._id ? r.user._id.toString() : null,
            directMatch,
            idMatch,
            isRead: r.isRead,
            isSeen: r.isSeen
          });
        }
      });
      
      console.log(`NOTIFICATION_STATUS - Match attempts:`, attempts);
      console.log(`NOTIFICATION_STATUS - Found recipient:`, recipient ? {
        user: recipient.user._id ? recipient.user._id.toString() : recipient.user.toString(),
        isRead: recipient.isRead,
        isSeen: recipient.isSeen
      } : 'NO RECIPIENT FOUND');
      
      notificationObj.isRead = recipient ? recipient.isRead : false;
      notificationObj.isSeen = recipient ? recipient.isSeen : false;
      
      // Additional logging to confirm extraction
      console.log(`NOTIFICATION_STATUS - Final status: isRead=${notificationObj.isRead}, isSeen=${notificationObj.isSeen}`);
      
      return notificationObj;
    });
    
    console.log(`Returning ${notificationsWithReadStatus.length} notifications with read status for user ${user._id}`);
    res.status(200).json(notificationsWithReadStatus);
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500);
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }
});



// @desc    Get sent notifications
// @route   GET /api/notifications/sent
// @access  Private/Teacher Admin
const getSentNotifications = asyncHandler(async (req, res) => {
  try {
    console.log('NOTIFICATION_SENT', `Getting sent notifications for user ${req.user._id} (${req.user.role}) in school ${req.user.schoolId}`);
    
    // In single database architecture, use schoolId filtering
    const query = {
      sender: req.user._id,
      schoolId: req.user.schoolId
    };
    
    console.log('NOTIFICATION_SENT', 'Query:', query);
    
    // Find sent notifications with new recipient structure populate
    const sentNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate('recipients.user', 'name email role')
      .populate('classes', 'name schoolBranch direction subject')
      .populate('schoolBranches', 'name location')
      .populate('sender', 'name role')
      .lean(); // Use lean for better performance
    
    console.log('NOTIFICATION_SENT', `Found ${sentNotifications.length} sent notifications`);
    
    // Add computed fields for frontend compatibility
    const enrichedNotifications = sentNotifications.map(notification => ({
      ...notification,
      isRead: notification.readBy?.some(r => r.user.toString() === req.user._id.toString()) || false,
      totalRecipients: notification.deliveryStats?.totalRecipients || notification.recipients?.length || 0,
      readCount: notification.deliveryStats?.read || 0,
      seenCount: notification.deliveryStats?.seen || 0
    }));
    
    res.status(200).json(enrichedNotifications);
  } catch (error) {
    console.error('NOTIFICATION_SENT', `Error fetching sent notifications: ${error.message}`, {
      userId: req.user._id,
      schoolId: req.user.schoolId,
      stack: error.stack
    });
    res.status(500);
    throw new Error(`Failed to fetch sent notifications: ${error.message}`);
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationRead = asyncHandler(async (req, res) => {
  try {
    console.log('NOTIFICATION_READ', `Marking notification ${req.params.id} as read by user ${req.user._id} (${req.user.role})`);
    
    // Find the notification with schoolId filtering
    const notification = await Notification.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId
    }).populate('classes', 'students teachers')
      .populate('schoolBranches', 'name');
    
    if (!notification) {
      console.log('NOTIFICATION_READ', `Notification ${req.params.id} not found`);
      res.status(404);
      throw new Error('Notification not found');
    }
    
    console.log('NOTIFICATION_READ', `Found notification: ${notification.title}`);
    
    // Check if this user is a recipient using the new recipient structure
    let isAuthorizedRecipient = false;
    
    // Direct recipient check with new structure
    const recipientEntry = notification.recipients.find(r => r.user && r.user.toString() === req.user._id.toString());
    if (recipientEntry) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_READ', 'User is direct recipient');
    }
    
    // NOTE: With new recipient structure, we only check direct recipients
    // Legacy role-based and class-based checks removed since recipients are now explicit
    
    // Admin/superadmin can always mark as read
    if (!isAuthorizedRecipient && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_READ', 'Admin/superadmin access granted');
    }
    
    if (!isAuthorizedRecipient) {
      console.log('NOTIFICATION_READ', `User ${req.user._id} not authorized to mark notification ${req.params.id} as read`);
      res.status(403);
      throw new Error('Not authorized to mark this notification as read');
    }
    
    // Use the new markAsReadBy method
    const wasAlreadyRead = notification.isReadBy(req.user._id);
    if (!wasAlreadyRead) {
      await notification.markAsReadBy(req.user._id);
      console.log('NOTIFICATION_READ', `Notification ${req.params.id} marked as read by user ${req.user._id}`);
    } else {
      console.log('NOTIFICATION_READ', `Notification ${req.params.id} already marked as read by user ${req.user._id}`);
    }
    
    res.status(200).json({ 
      success: true, 
      message: wasAlreadyRead ? 'Already marked as read' : 'Marked as read'
    });
  } catch (error) {
    console.error('NOTIFICATION_READ', `Error marking notification as read: ${error.message}`, {
      notificationId: req.params.id,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(error.status || 500);
    throw new Error(error.message || 'Failed to mark notification as read');
  }
});

// @desc    Mark notification as seen
// @route   PUT /api/notifications/:id/seen
// @access  Private
const markNotificationSeen = asyncHandler(async (req, res) => {
  try {
    console.log('NOTIFICATION_SEEN', `Marking notification ${req.params.id} as seen by user ${req.user._id} (${req.user.role})`);
    
    // Find the notification with schoolId filtering
    const notification = await Notification.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId
    }).populate('classes', 'students teachers')
      .populate('schoolBranches', 'name');
    
    if (!notification) {
      console.log('NOTIFICATION_SEEN', `Notification ${req.params.id} not found`);
      res.status(404);
      throw new Error('Notification not found');
    }
    
    // Check if user is authorized recipient
    let isAuthorizedRecipient = false;
    
    // Direct recipient check with new structure
    const recipientEntry = notification.recipients.find(r => r.user && r.user.toString() === req.user._id.toString());
    if (recipientEntry) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_SEEN', 'User is direct recipient');
    }
    
    // Admin/superadmin can always mark as seen
    if (!isAuthorizedRecipient && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_SEEN', 'Admin/superadmin access granted');
    }
    
    if (!isAuthorizedRecipient) {
      console.log('NOTIFICATION_SEEN', `User ${req.user._id} not authorized to mark notification ${req.params.id} as seen`);
      res.status(403);
      throw new Error('Not authorized to mark this notification as seen');
    }
    
    // Use the new markAsSeenBy method
    const wasAlreadySeen = notification.isSeenBy(req.user._id);
    if (!wasAlreadySeen) {
      await notification.markAsSeenBy(req.user._id);
      console.log('NOTIFICATION_SEEN', `Notification ${req.params.id} marked as seen by user ${req.user._id}`);
    } else {
      console.log('NOTIFICATION_SEEN', `Notification ${req.params.id} already marked as seen by user ${req.user._id}`);
    }
    
    res.status(200).json({ 
      success: true, 
      message: wasAlreadySeen ? 'Already marked as seen' : 'Marked as seen'
    });
    
  } catch (error) {
    console.error('NOTIFICATION_SEEN', `Error marking notification as seen: ${error.message}`, {
      notificationId: req.params.id,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(error.status || 500);
    throw new Error(error.message || 'Failed to mark notification as seen');
  }
});

// @desc    Get a specific notification
// @route   GET /api/notifications/:id
// @access  Private
const getNotificationById = asyncHandler(async (req, res) => {
  try {
    const notificationId = req.params.id;
    console.log(`Fetching notification by ID: ${notificationId}`);
    
    // In single database architecture, use schoolId filtering
    const notification = await Notification.findOne({
      _id: notificationId,
      schoolId: req.user.schoolId
    })
    .populate('sender', 'name')
    .populate('recipients.user', 'name')
    .populate('schoolId', 'name')
    .populate('classes', 'name');
    
    if (!notification) {
      // Special case for superadmin - can see any notification
      if (req.user.role === 'superadmin') {
        const adminNotification = await Notification.findById(notificationId)
          .populate('sender', 'name')
          .populate('recipients.user', 'name')
          .populate('schoolId', 'name')
          .populate('classes', 'name');
        
        if (adminNotification) {
          return res.status(200).json(adminNotification);
        }
      }
      
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json(notification);
  } catch (error) {
    console.error('Error fetching notification by ID:', error.message);
    res.status(500);
    throw new Error(`Failed to fetch notification: ${error.message}`);
  }
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private/Teacher Admin
const deleteNotification = asyncHandler(async (req, res) => {
  console.log(`Attempting to delete notification ${req.params.id}`);

  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      console.log(`Notification not found: ${req.params.id}`);
      res.status(404);
      throw new Error('Notification not found');
    }

    // Verify the notification belongs to the user's school (multi-tenancy security)
    if (notification.schoolId && notification.schoolId.toString() !== req.user.schoolId.toString()) {
      console.log(`School mismatch: notification school ${notification.schoolId}, user school ${req.user.schoolId}`);
      res.status(404); // Use 404 instead of 403 to prevent school ID enumeration
      throw new Error('Notification not found');
    }

    // Check if user is allowed to delete this notification
    const isOwner = notification.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      console.log(`Not authorized: user ${req.user._id} attempted to delete notification ${notification._id} created by ${notification.sender}`);
      res.status(403);
      throw new Error('Not authorized to delete this notification');
    }

    console.log(`Deleting notification ${notification._id}`);
    await Notification.findByIdAndDelete(req.params.id);
    
    console.log(`Notification ${notification._id} successfully deleted`);
    res.status(200).json({ 
      success: true,
      message: 'Notification successfully removed' 
    });
  } catch (error) {
    console.error(`Error deleting notification:`, error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
// @access  Private
const getVapidPublicKey = asyncHandler(async (req, res) => {
  console.log('[NOTIFICATIONS] VAPID public key request from user:', req.user._id);
  
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  console.log('[NOTIFICATIONS] VAPID key check:', {
    hasKey: !!publicKey,
    keyLength: publicKey ? publicKey.length : 0,
    userId: req.user._id
  });
  
  if (!publicKey) {
    console.error('[NOTIFICATIONS] VAPID_PUBLIC_KEY environment variable not set');
    return res.status(500).json({ 
      success: false,
      error: 'Push notifications not configured on server' 
    });
  }

  console.log('[NOTIFICATIONS] Returning VAPID public key to client');
  res.status(200).json({ 
    success: true,
    vapidPublicKey: publicKey 
  });
});

// @desc    Create or update push subscription
// @route   POST /api/notifications/subscription
// @access  Private
const createPushSubscription = asyncHandler(async (req, res) => {
  const { endpoint, keys, expirationTime } = req.body;
  
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    res.status(400);
    throw new Error('Invalid subscription data - missing required fields');
  }
  
  try {
    console.log(`Creating/updating push subscription for user ${req.user._id}`);
    
    // Find existing subscription for this user and endpoint
    let subscription = await PushSubscription.findOne({
      userId: req.user._id,
      endpoint
    });
    
    if (subscription) {
      // Update existing subscription
      subscription.keys.p256dh = keys.p256dh;
      subscription.keys.auth = keys.auth;
      if (expirationTime) {
        subscription.expirationTime = expirationTime;
      }
      await subscription.save();
      console.log(`Updated existing subscription for user ${req.user._id}`);
    } else {
      // Create new subscription
      const subscriptionData = {
        userId: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        schoolId: req.user.schoolId, // Add schoolId for multi-tenancy
        userAgent: req.headers['user-agent'] || '',
        platform: {
          isIOS: /iPad|iPhone|iPod/.test(req.headers['user-agent'] || ''),
          isAndroid: /Android/.test(req.headers['user-agent'] || ''),
          isWindows: /Windows/.test(req.headers['user-agent'] || ''),
          isSafari: /Safari/.test(req.headers['user-agent'] || '') && !/Chrome/.test(req.headers['user-agent'] || ''),
          isChrome: /Chrome/.test(req.headers['user-agent'] || ''),
          isFirefox: /Firefox/.test(req.headers['user-agent'] || ''),
          isPWA: req.headers['user-agent']?.includes('PWA') || false,
          browserName: req.headers['user-agent'] || '',
          osName: req.headers['user-agent'] || ''
        }
      };
      
      if (expirationTime) {
        subscriptionData.expirationTime = expirationTime;
      }
      
      subscription = await PushSubscription.create(subscriptionData);
      console.log(`Created new subscription for user ${req.user._id}`);
    }
    
    res.status(201).json({
      success: true,
      message: 'Push subscription saved successfully'
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500);
    throw new Error('Failed to save push subscription: ' + error.message);
  }
});

// @desc    Get user push subscriptions
// @route   GET /api/notifications/subscriptions
// @access  Private
const getUserSubscriptions = asyncHandler(async (req, res) => {
  try {
    console.log(`[SUBSCRIPTIONS] Getting subscriptions for user ${req.user._id}`);
    
    const subscriptions = await PushSubscription.find({
      userId: req.user._id,
      isActive: true
    }).select('endpoint platform createdAt lastUsed stats');
    
    console.log(`[SUBSCRIPTIONS] Found ${subscriptions.length} active subscriptions`);
    
    res.status(200).json({
      success: true,
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('[SUBSCRIPTIONS] Error getting user subscriptions:', error);
    res.status(500);
    throw new Error('Failed to get subscriptions: ' + error.message);
  }
});

// @desc    Delete push subscription
// @route   DELETE /api/notifications/subscription
// @access  Private
const deletePushSubscription = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  
  if (!endpoint) {
    res.status(400);
    throw new Error('Endpoint is required');
  }
  
  try {
    console.log(`[SUBSCRIPTIONS] Deleting subscription for user ${req.user._id}, endpoint: ${endpoint.substring(0, 50)}...`);
    
    const result = await PushSubscription.deleteOne({
      userId: req.user._id,
      endpoint
    });
    
    if (result.deletedCount === 0) {
      res.status(404);
      throw new Error('Subscription not found');
    }
    
    console.log(`[SUBSCRIPTIONS] Successfully deleted subscription`);
    res.status(200).json({
      success: true,
      message: 'Push subscription deleted successfully'
    });
  } catch (error) {
    console.error('[SUBSCRIPTIONS] Error deleting subscription:', error);
    res.status(500);
    throw new Error('Failed to delete subscription: ' + error.message);
  }
});

// @desc    Send test push notification
// @route   POST /api/notifications/test
// @access  Private
const sendTestPush = asyncHandler(async (req, res) => {
  try {
    console.log(`[TEST_PUSH] Sending test notification to user ${req.user._id}`);
    
    const subscriptions = await PushSubscription.find({
      userId: req.user._id,
      isActive: true
    });
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active push subscriptions found'
      });
    }
    
    const webpush = require('web-push');
    const { title = 'Test Notification', body = 'This is a test push notification from GradeBook' } = req.body;
    
    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: '/notifications',
        timestamp: Date.now()
      }
    });
    
    let successful = 0;
    let failed = 0;
    
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        await subscription.updateStats(true);
        successful++;
        console.log(`[TEST_PUSH] Success for subscription ${subscription._id}`);
      } catch (error) {
        await subscription.updateStats(false, error);
        failed++;
        console.error(`[TEST_PUSH] Failed for subscription ${subscription._id}:`, error.message);
      }
    });
    
    await Promise.allSettled(pushPromises);
    
    console.log(`[TEST_PUSH] Test completed: ${successful} successful, ${failed} failed`);
    res.status(200).json({
      success: true,
      message: 'Test notifications sent',
      results: {
        total: subscriptions.length,
        successful,
        failed
      }
    });
  } catch (error) {
    console.error('[TEST_PUSH] Error sending test notification:', error);
    res.status(500);
    throw new Error('Failed to send test notification: ' + error.message);
  }
});

module.exports = {
  createNotification,
  getAllNotifications,
  getSentNotifications,
  markNotificationRead,
  markNotificationSeen,
  getNotificationById,
  deleteNotification,
  getVapidPublicKey,
  createPushSubscription,
  getUserSubscriptions,
  deletePushSubscription,
  sendTestPush
};
