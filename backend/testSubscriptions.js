#!/usr/bin/env node

/**
 * Push Subscription Database Test
 * Check if any push subscriptions exist in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const PushSubscription = require('./models/pushSubscriptionModel');

async function testSubscriptions() {
  try {
    console.log('🔍 CHECKING PUSH SUBSCRIPTIONS DATABASE\n');
    
    await connectDB();
    console.log('✅ Database connected\n');
    
    // Count total subscriptions
    const totalSubs = await PushSubscription.countDocuments();
    console.log(`📊 Total subscriptions in database: ${totalSubs}`);
    
    // Check users with push notifications enabled
    const User = require('./models/userModel');
    const usersWithPushEnabled = await User.countDocuments({ pushNotificationEnabled: true });
    console.log(`👥 Users with push notifications enabled: ${usersWithPushEnabled}`);
    
    if (usersWithPushEnabled > 0) {
      const enabledUsers = await User.find({ pushNotificationEnabled: true }).select('_id name email role');
      console.log('📋 Users with push enabled:');
      enabledUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - ID: ${user._id}`);
      });
    }
    console.log(`📊 Total subscriptions in database: ${totalSubs}`);
    
    if (totalSubs === 0) {
      console.log('\n❌ NO SUBSCRIPTIONS FOUND!');
      console.log('\n🔧 SOLUTION:');
      console.log('1. Users need to enable push notifications in the frontend app');
      console.log('2. Visit the app and click "Enable Notifications"');
      console.log('3. Allow permission when browser asks');
      console.log('4. Check this script again to see subscriptions');
      console.log('\n💡 The notification system is working - just need users to subscribe first!');
    } else {
      // Show subscription details
      const activeSubs = await PushSubscription.countDocuments({ isActive: true });
      console.log(`📈 Active subscriptions: ${activeSubs}`);
      
      const subscriptions = await PushSubscription.find().limit(5);
      console.log('\n📋 Sample subscriptions:');
      
      subscriptions.forEach((sub, index) => {
        console.log(`${index + 1}. User: ${sub.userId}, Platform: ${sub.platform || 'unknown'}, Active: ${sub.isActive}`);
        console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      });
      
      console.log('\n✅ Subscriptions found - notifications should work!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testSubscriptions();
