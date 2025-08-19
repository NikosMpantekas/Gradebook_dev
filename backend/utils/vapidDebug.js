const webpush = require('web-push');

/**
 * VAPID Debugging Utility
 * Helps diagnose VAPID key and JWT token issues
 */

function debugVapidConfiguration() {
  console.log('\n=== VAPID CONFIGURATION DEBUG ===');
  
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log(`  VAPID_EMAIL: ${vapidEmail ? 'SET' : 'MISSING'} (${vapidEmail})`);
  console.log(`  VAPID_PUBLIC_KEY: ${vapidPublicKey ? 'SET' : 'MISSING'} (length: ${vapidPublicKey?.length || 0})`);
  console.log(`  VAPID_PRIVATE_KEY: ${vapidPrivateKey ? 'SET' : 'MISSING'} (length: ${vapidPrivateKey?.length || 0})`);
  
  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    console.error('❌ CRITICAL: Missing VAPID environment variables');
    return false;
  }
  
  // Validate key formats
  console.log('\nKey Format Validation:');
  
  // Public key should be 87 characters and start with 'B'
  const publicKeyValid = vapidPublicKey.length === 87 && vapidPublicKey.startsWith('B');
  console.log(`  Public Key: ${publicKeyValid ? '✅ Valid' : '❌ Invalid'} (${vapidPublicKey.substring(0, 10)}...)`);
  
  // Private key should be 43 characters
  const privateKeyValid = vapidPrivateKey.length === 43;
  console.log(`  Private Key: ${privateKeyValid ? '✅ Valid' : '❌ Invalid'} (length: ${vapidPrivateKey.length})`);
  
  // Email format
  const emailValid = vapidEmail.includes('@') && vapidEmail.includes('.');
  console.log(`  Email: ${emailValid ? '✅ Valid' : '❌ Invalid'} (${vapidEmail})`);
  
  if (!publicKeyValid || !privateKeyValid || !emailValid) {
    console.error('❌ CRITICAL: Invalid VAPID key formats');
    return false;
  }
  
  // Test webpush configuration
  console.log('\nWebPush Configuration Test:');
  try {
    const emailSubject = vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`;
    
    webpush.setVapidDetails(
      emailSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    console.log('✅ WebPush VAPID configuration successful');
    console.log(`   Subject: ${emailSubject}`);
    
    // Test JWT generation (internal webpush function)
    try {
      // This tests if the keys can generate a valid JWT
      const testEndpoint = 'https://web.push.apple.com/test';
      const options = webpush.generateRequestDetails({ endpoint: testEndpoint, keys: {} }, {});
      console.log('✅ JWT token generation test successful');
      console.log(`   Authorization header length: ${options.headers?.Authorization?.length || 0}`);
    } catch (jwtError) {
      console.error('❌ JWT token generation failed:', jwtError.message);
      return false;
    }
    
  } catch (configError) {
    console.error('❌ WebPush configuration failed:', configError.message);
    return false;
  }
  
  console.log('\n✅ All VAPID checks passed - configuration should work\n');
  return true;
}

function generateNewVapidKeys() {
  console.log('\n=== GENERATING NEW VAPID KEYS ===');
  try {
    const vapidKeys = webpush.generateVAPIDKeys();
    
    console.log('New VAPID Keys Generated:');
    console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    console.log('VAPID_EMAIL=your-email@domain.com');
    
    console.log('\nValidation:');
    console.log(`Public Key Length: ${vapidKeys.publicKey.length} (should be 87)`);
    console.log(`Private Key Length: ${vapidKeys.privateKey.length} (should be 43)`);
    console.log(`Public Key Format: ${vapidKeys.publicKey.startsWith('B') ? '✅ Valid' : '❌ Invalid'}`);
    
    return vapidKeys;
  } catch (error) {
    console.error('❌ Failed to generate VAPID keys:', error.message);
    return null;
  }
}

function debugApnsPushError(error, subscription) {
  console.log('\n=== APNS PUSH ERROR DEBUG ===');
  
  console.log('Error Details:');
  console.log(`  Status Code: ${error.statusCode}`);
  console.log(`  Error Name: ${error.name}`);
  console.log(`  Error Message: ${error.message}`);
  
  if (error.headers) {
    console.log('Response Headers:');
    Object.entries(error.headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
  
  if (error.body) {
    console.log(`Response Body: ${error.body}`);
    try {
      const bodyJson = JSON.parse(error.body);
      console.log('Parsed Body:', bodyJson);
      
      if (bodyJson.reason) {
        console.log(`APNs Reason: ${bodyJson.reason}`);
        
        switch (bodyJson.reason) {
          case 'BadJwtToken':
            console.log('❌ DIAGNOSIS: Invalid VAPID JWT token');
            console.log('   - Check VAPID keys are correctly formatted');
            console.log('   - Verify VAPID email is valid');
            console.log('   - Ensure webpush.setVapidDetails() was called');
            break;
          case 'InvalidProviderToken':
            console.log('❌ DIAGNOSIS: Invalid or expired provider token');
            break;
          case 'BadDeviceToken':
            console.log('❌ DIAGNOSIS: Invalid device token/subscription');
            break;
          case 'BadTopic':
            console.log('❌ DIAGNOSIS: Invalid topic in JWT');
            break;
          default:
            console.log(`❌ DIAGNOSIS: Unknown APNs error: ${bodyJson.reason}`);
        }
      }
    } catch (parseError) {
      console.log('Could not parse response body as JSON');
    }
  }
  
  if (subscription) {
    console.log('\nSubscription Details:');
    console.log(`  Endpoint: ${subscription.endpoint?.substring(0, 50)}...`);
    console.log(`  Has Keys: ${!!(subscription.keys?.p256dh && subscription.keys?.auth)}`);
    console.log(`  Platform: iOS (Apple Push Service)`);
  }
  
  console.log('\n');
}

module.exports = {
  debugVapidConfiguration,
  generateNewVapidKeys,
  debugApnsPushError
};
