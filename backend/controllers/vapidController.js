const asyncHandler = require('express-async-handler');

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
// @access  Private
const getVapidPublicKey = asyncHandler(async (req, res) => {
  console.log('[VAPID] Getting VAPID public key request');
  
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  
  console.log('[VAPID] Environment check:', {
    hasPublicKey: !!publicKey,
    keyLength: publicKey ? publicKey.length : 0
  });
  
  if (!publicKey) {
    console.error('[VAPID] VAPID_PUBLIC_KEY environment variable not set');
    return res.status(500).json({ 
      error: 'VAPID public key not configured on server' 
    });
  }

  console.log('[VAPID] Returning VAPID public key to client');
  res.status(200).json({ vapidPublicKey: publicKey });
});

module.exports = {
  getVapidPublicKey,
};
