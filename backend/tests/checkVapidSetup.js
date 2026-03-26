#!/usr/bin/env node

/**
 * VAPID Setup Checker
 * Verifies your existing VAPID keys are properly configured
 * Run: node checkVapidSetup.js
 */

require('dotenv').config();
const webpush = require('web-push');

console.log('🔍 CHECKING EXISTING VAPID CONFIGURATION\n');

const vapidEmail = process.env.VAPID_EMAIL;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

console.log('📋 Environment Variables Status:');
console.log(`VAPID_EMAIL: ${vapidEmail ? '✅ SET' : '❌ MISSING'} (${vapidEmail || 'NOT_SET'})`);
console.log(`VAPID_PUBLIC_KEY: ${vapidPublicKey ? '✅ SET' : '❌ MISSING'} (length: ${vapidPublicKey?.length || 0})`);
console.log(`VAPID_PRIVATE_KEY: ${vapidPrivateKey ? '✅ SET' : '❌ MISSING'} (length: ${vapidPrivateKey?.length || 0})`);

if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
  console.log('\n❌ ISSUE FOUND: Missing environment variables');
  console.log('\n🔧 SOLUTION:');
  console.log('Set these environment variables on your server:');
  console.log('VAPID_EMAIL=your-email@domain.com');
  console.log('VAPID_PUBLIC_KEY=your_public_key_here');
  console.log('VAPID_PRIVATE_KEY=your_private_key_here');
  process.exit(1);
}

console.log('\n🔧 Key Format Validation:');
const publicKeyValid = vapidPublicKey.length === 87 && vapidPublicKey.startsWith('B');
const privateKeyValid = vapidPrivateKey.length === 43;
const emailValid = vapidEmail.includes('@') && vapidEmail.includes('.');

console.log(`Public Key Format: ${publicKeyValid ? '✅ Valid' : '❌ Invalid'} (${vapidPublicKey.substring(0, 20)}...)`);
console.log(`Private Key Format: ${privateKeyValid ? '✅ Valid' : '❌ Invalid'} (${vapidPrivateKey.substring(0, 10)}...)`);
console.log(`Email Format: ${emailValid ? '✅ Valid' : '❌ Invalid'} (${vapidEmail})`);

if (!publicKeyValid || !privateKeyValid || !emailValid) {
  console.log('\n❌ ISSUE FOUND: Invalid key format');
  console.log('\n🔧 SOLUTION:');
  console.log('- Public key should be 87 characters and start with "B"');
  console.log('- Private key should be 43 characters');
  console.log('- Email should be a valid email address');
  process.exit(1);
}

console.log('\n🚀 Testing WebPush Configuration:');
try {
  const emailSubject = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`;
  
  webpush.setVapidDetails(
    emailSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
  
  console.log('✅ WebPush VAPID configuration successful');
  
  // Test JWT generation capability
  const testEndpoint = 'https://web.push.apple.com/test';
  const options = webpush.generateRequestDetails({ endpoint: testEndpoint, keys: {} }, {});
  
  if (options.headers && options.headers.Authorization) {
    console.log('✅ JWT token generation working');
    console.log(`   Authorization header length: ${options.headers.Authorization.length}`);
  } else {
    console.log('❌ JWT token generation failed - no Authorization header');
    process.exit(1);
  }
  
} catch (error) {
  console.log('❌ WebPush configuration failed:', error.message);
  console.log('\n🔧 SOLUTION:');
  console.log('- Verify your VAPID keys are correct');
  console.log('- Check for any extra spaces or characters in the environment variables');
  process.exit(1);
}

console.log('\n✅ ALL CHECKS PASSED!');
console.log('\n📋 Next Steps:');
console.log('1. Restart your backend server to load the new configuration');
console.log('2. Clear existing push subscriptions in browsers');
console.log('3. Re-enable push notifications in your app');
console.log('4. Send a test notification');

console.log('\n💡 If still getting BadJwtToken errors:');
console.log('- Ensure environment variables are loaded at runtime (not just in .env file)');
console.log('- Check your deployment platform environment variable settings');
console.log('- Verify no other code is overriding the VAPID configuration');
