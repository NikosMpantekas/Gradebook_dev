const asyncHandler = require('express-async-handler');
const webpush = require('web-push');
const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const Subscription = require('../models/subscriptionModel');

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
    // Create notification with new class-based structure
    const notificationData = {
      title,
      message,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      recipients: recipients || [],
      classes: classes || [],
      schoolBranches: schoolBranches || [],
      targetRole: targetRole || 'all',
      schoolId: req.user.schoolId,
      urgent: urgent || false,
      expiresAt: expiresAt || null,
      sendToAll: sendToAll || false,
      status: 'sent'
    };

    console.log('NOTIFICATION_CREATE', 'Creating notification with data:', {
      ...notificationData,
      message: message.substring(0, 100) + '...'
    });

    const newNotification = await Notification.create(notificationData);
    console.log('NOTIFICATION_CREATE', 'Notification created with ID:', newNotification._id);

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
      console.log('[SECURITY] Processing sendToAll notification with role restrictions');
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
        
        // SECURITY: Validate each recipient against sender permissions
        const recipientUsers = await User.find({
          _id: { $in: recipients },
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

    // Update notification with final recipient list
    newNotification.recipients = uniqueRecipients;
    newNotification.deliveryStats.totalRecipients = uniqueRecipients.length;
    await newNotification.save();

    // Find web push subscriptions for recipients
    const subscriptions = await Subscription.find({
      user: { $in: uniqueRecipients }
    });

    console.log('NOTIFICATION_CREATE', `Found ${subscriptions.length} push subscriptions`);

    // Send push notifications (if web push is enabled)
    if (subscriptions.length > 0) {
      const pushPromises = subscriptions.map(subscription => {
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
          .catch(error => {
            console.error('NOTIFICATION_CREATE', `Push notification failed for subscription ${subscription._id}:`, error.message);
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
      // STUDENTS: Can ONLY see notifications specifically intended for them - NO cross-role visibility
      query.$and = [
        {
          $or: [
            { recipients: req.user._id }, // Directly addressed to this student
            {
              $and: [
                { targetRole: { $in: ['student', 'all'] } }, // Only student/all roles
                {
                  $or: [
                    { classes: { $in: req.user.classes || [] } }, // Their classes only
                    { schoolBranches: req.user.schoolBranch }, // Their branch only
                    { sendToAll: true } // School-wide announcements
                  ]
                }
              ]
            }
          ]
        },
        // SECURITY: Exclude any notifications with teacher-only or admin-only roles
        { targetRole: { $nin: ['teacher', 'admin'] } },
        // SECURITY: Exclude notifications sent by teachers to other teachers
        {
          $or: [
            { senderRole: { $ne: 'teacher' } },
            { targetRole: { $in: ['student', 'all'] } }
          ]
        }
      ];
    }
    else if (req.user.role === 'teacher') {
      // TEACHERS: Can see notifications they sent OR that are specifically targeted to them
      query.$and = [
        {
          $or: [
            { sender: req.user._id }, // Notifications they created
            { recipients: req.user._id }, // Directly addressed to this teacher
            {
              $and: [
                { targetRole: { $in: ['teacher', 'all'] } }, // Only teacher/all roles
                {
                  $or: [
                    { classes: { $in: req.user.classes || [] } }, // Classes they teach
                    { schoolBranches: req.user.schoolBranch }, // Their branch
                    { sendToAll: true } // School-wide announcements
                  ]
                }
              ]
            }
          ]
        },
        // SECURITY: Exclude student-only notifications they didn't create
        {
          $or: [
            { sender: req.user._id }, // They created it
            { targetRole: { $nin: ['student'] } }, // Not student-only
            { targetRole: { $in: ['teacher', 'all'] } } // Teacher-allowed roles
          ]
        }
      ];
    }
    else if (req.user.role === 'admin') {
      // ADMINS: Can see all notifications in their school (no additional restrictions)
      // query already has schoolId filter which is sufficient for admins
      console.log('[SECURITY] Admin user - full school access granted');
    }
    else if (req.user.role === 'parent') {
      // PARENTS: Can see notifications sent to them or their children
      console.log('[SECURITY] Parent user - applying parent-specific filtering for user:', req.user._id);
      
      // Find parent's linked students
      const parentUser = await User.findById(req.user._id).select('linkedStudentIds').lean();
      const linkedStudentIds = parentUser?.linkedStudentIds || [];
      
      query.$or = [
        // Notifications sent directly to parent
        { recipients: req.user._id },
        // Notifications sent to parent's linked students
        ...(linkedStudentIds.length > 0 ? [{ recipients: { $in: linkedStudentIds } }] : [])
      ];
      
      console.log(`[SECURITY] Parent ${req.user._id} can access notifications for ${linkedStudentIds.length} linked students`);
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
      .populate('recipients', 'name')
      .populate('schoolId', 'name')
      .populate('classes', 'name');
    
    console.log(`Found ${notifications.length} notifications`);
    
    // Compute isRead for each notification for the current user
    const notificationsWithReadStatus = notifications.map(notification => {
      const notificationObj = notification.toObject();
      // Check if current user has read this notification by checking readBy array
      const readEntry = notification.readBy?.find(entry => 
        entry.userId && entry.userId.toString() === user._id.toString()
      );
      notificationObj.isRead = !!readEntry;
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
    
    // Find sent notifications with new class-based populate
    const sentNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate('recipients', 'name email role')
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
      readCount: notification.deliveryStats?.read || 0
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
    
    // Check if this user is a recipient using the new class-based system
    let isAuthorizedRecipient = false;
    
    // Direct recipient check
    const isDirectRecipient = notification.recipients.some(r => r.toString() === req.user._id.toString());
    if (isDirectRecipient) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_READ', 'User is direct recipient');
    }
    
    // Role-based recipient check
    if (!isAuthorizedRecipient && notification.targetRole && 
        (notification.targetRole === req.user.role || notification.targetRole === 'all')) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_READ', `User matches target role: ${notification.targetRole}`);
    }
    
    // Send to all check
    if (!isAuthorizedRecipient && notification.sendToAll) {
      isAuthorizedRecipient = true;
      console.log('NOTIFICATION_READ', 'Notification is sent to all users');
    }
    
    // Class-based recipient check
    if (!isAuthorizedRecipient && notification.classes && notification.classes.length > 0) {
      for (const classObj of notification.classes) {
        const classStudents = classObj.students || [];
        const classTeachers = classObj.teachers || [];
        
        if (classStudents.some(s => s.toString() === req.user._id.toString()) ||
            classTeachers.some(t => t.toString() === req.user._id.toString())) {
          isAuthorizedRecipient = true;
          console.log('NOTIFICATION_READ', `User found in class: ${classObj.name || classObj._id}`);
          break;
        }
      }
    }
    
    // School branch based recipient check
    if (!isAuthorizedRecipient && notification.schoolBranches && notification.schoolBranches.length > 0 && req.user.schoolBranch) {
      const userSchoolBranch = req.user.schoolBranch.toString();
      const hasMatchingBranch = notification.schoolBranches.some(branch => 
        branch._id.toString() === userSchoolBranch
      );
      if (hasMatchingBranch) {
        isAuthorizedRecipient = true;
        console.log('NOTIFICATION_READ', 'User matches school branch criteria');
      }
    }
    
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
    .populate('recipients', 'name')
    .populate('schoolId', 'name')
    .populate('classes', 'name');
    
    if (!notification) {
      // Special case for superadmin - can see any notification
      if (req.user.role === 'superadmin') {
        const adminNotification = await Notification.findById(notificationId)
          .populate('sender', 'name')
          .populate('recipients', 'name')
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

// @desc    Get VAPID public key for push notifications
// @route   GET /api/notifications/vapid-public-key
// @access  Private
const getVapidPublicKey = asyncHandler(async (req, res) => {
  // In a production app, these would be stored securely in environment variables
  // For this app, we'll use a default public key that works for development
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
  
  console.log('Providing VAPID public key for push notifications');
  
  res.json({ vapidPublicKey });
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
    let subscription = await Subscription.findOne({
      user: req.user._id,
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
        user: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth
        },
        schoolId: req.user.schoolId, // Add schoolId for multi-tenancy
        isSuperadmin: req.user.role === 'superadmin'
      };
      
      if (expirationTime) {
        subscriptionData.expirationTime = expirationTime;
      }
      
      subscription = await Subscription.create(subscriptionData);
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

module.exports = {
  createNotification,
  getAllNotifications,
  getSentNotifications,
  markNotificationRead,
  getNotificationById,
  deleteNotification,
  getVapidPublicKey,
  createPushSubscription
};
