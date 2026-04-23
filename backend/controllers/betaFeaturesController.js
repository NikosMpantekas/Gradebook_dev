const asyncHandler = require('express-async-handler');
const BetaFeatures = require('../models/betaFeaturesModel');

// @desc  Get all beta feature route flags
// @route GET /api/beta-features
// @access Private (any authenticated user — needed to render beta badges)
const getBetaFeatures = asyncHandler(async (req, res) => {
  console.log(`[BetaFeatures] GET requested by user ${req.user?._id} (${req.user?.role})`);
  const doc = await BetaFeatures.getSingleton();

  const routesObj = {};
  if (doc.routes) {
    doc.routes.forEach((value, key) => {
      routesObj[key] = value;
    });
  }

  res.json({ success: true, routes: routesObj });
});

// @desc  Update beta feature route flags
// @route PUT /api/beta-features
// @access Private/SuperAdmin
const updateBetaFeatures = asyncHandler(async (req, res) => {
  console.log(`[BetaFeatures] PUT requested by user ${req.user?._id} (${req.user?.role})`);

  if (req.user?.role !== 'superadmin') {
    res.status(403);
    throw new Error('Superadmin access required');
  }

  const { routes } = req.body;
  if (!routes || typeof routes !== 'object') {
    res.status(400);
    throw new Error('routes object is required');
  }

  const doc = await BetaFeatures.getSingleton();

  Object.entries(routes).forEach(([path, isBeta]) => {
    doc.routes.set(path, Boolean(isBeta));
  });

  await doc.save();
  console.log(`[BetaFeatures] Updated ${Object.keys(routes).length} route flags`);

  const routesObj = {};
  doc.routes.forEach((value, key) => {
    routesObj[key] = value;
  });

  res.json({ success: true, routes: routesObj });
});

module.exports = { getBetaFeatures, updateBetaFeatures };
