#!/usr/bin/env node

/**
 * VAPID Test Script
 * Run this to diagnose push notification authentication issues
 * Usage: node testVapid.js
 */

require('dotenv').config();
const { debugVapidConfiguration, generateNewVapidKeys } = require('./utils/vapidDebug');

console.log('🔍 DIAGNOSING PUSH NOTIFICATION AUTHENTICATION ISSUE');
console.log('Problem: All push notifications failing with {"reason":"BadJwtToken"}');
console.log('This indicates VAPID JWT authentication is failing.\n');

// Test current configuration
const isValid = debugVapidConfiguration();

if (!isValid) {
  console.log('💡 SOLUTION: Generate new VAPID keys or fix environment variables');
  console.log('\nGenerating new VAPID keys for reference:');
  generateNewVapidKeys();
  console.log('\nTo fix the issue:');
  console.log('1. Set these environment variables in your deployment platform');
  console.log('2. Restart the backend server');
  console.log('3. Test push notifications again');
} else {
  console.log('✅ VAPID configuration appears correct');
  console.log('If still getting BadJwtToken errors, check:');
  console.log('1. Environment variables are properly loaded at runtime');
  console.log('2. Backend server was restarted after setting variables');
  console.log('3. No conflicting VAPID configurations in other files');
}

console.log('\n🔧 Next steps after fixing VAPID keys:');
console.log('1. Restart backend server');
console.log('2. Clear browser push subscriptions (or they will still use old keys)');
console.log('3. Re-enable push notifications in frontend');
console.log('4. Send test notification');
