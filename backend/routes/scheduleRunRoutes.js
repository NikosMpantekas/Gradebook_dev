const express = require('express');
const router  = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  generateRun,
  listRuns,
  getRun,
  applyCandidate,
  updateUserAvailability,
  updateClassConfig,
} = require('../controllers/scheduleRunController');

router.post('/generate',                      protect, admin, generateRun);
router.get('/',                               protect, admin, listRuns);
router.get('/:id',                            protect, admin, getRun);
router.post('/:id/apply/:rank',               protect, admin, applyCandidate);
router.put('/availability/:userId',           protect, admin, updateUserAvailability);
router.put('/class-config/:classId',          protect, admin, updateClassConfig);

module.exports = router;
