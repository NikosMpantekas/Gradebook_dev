const mongoose = require('mongoose');
const User = require('../models/userModel');

/**
 * Migration: Add pushNotificationEnabled field to all users
 * This migration runs on server startup to ensure all users have the push notification preference field
 */
const addPushNotificationEnabledField = async () => {
  try {
    console.log('🔄 Running migration: Add pushNotificationEnabled field to users...');
    
    // Count users without the pushNotificationEnabled field
    const usersWithoutField = await User.countDocuments({
      pushNotificationEnabled: { $exists: false }
    });
    
    if (usersWithoutField === 0) {
      console.log('✅ All users already have pushNotificationEnabled field. Migration skipped.');
      return { success: true, updated: 0 };
    }
    
    console.log(`📊 Found ${usersWithoutField} users without pushNotificationEnabled field`);
    
    // Update all users that don't have the pushNotificationEnabled field
    const result = await User.updateMany(
      { pushNotificationEnabled: { $exists: false } },
      { 
        $set: { 
          pushNotificationEnabled: true // Default to enabled for existing users
        }
      }
    );
    
    console.log(`✅ Migration completed: Updated ${result.modifiedCount} users with pushNotificationEnabled field`);
    
    return { 
      success: true, 
      updated: result.modifiedCount,
      message: `Added pushNotificationEnabled field to ${result.modifiedCount} users`
    };
    
  } catch (error) {
    console.error('❌ Migration failed: Add pushNotificationEnabled field to users:', error);
    throw error;
  }
};

module.exports = {
  addPushNotificationEnabledField,
  migrationName: 'addPushNotificationEnabled',
  description: 'Adds pushNotificationEnabled field to all users who lack it'
};
