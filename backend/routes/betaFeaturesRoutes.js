const express = require('express');
const router = express.Router();
const { getBetaFeatures, updateBetaFeatures } = require('../controllers/betaFeaturesController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getBetaFeatures);
router.put('/', protect, updateBetaFeatures);

module.exports = router;
