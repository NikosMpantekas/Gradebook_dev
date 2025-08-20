const express = require('express');
const router = express.Router();
const {
  getPayments,
  getStudentPayments,
  createOrUpdatePayment,
  updatePayment,
  deletePayment,
  generateMonthlyPayments,
  getPaymentStats
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Get all payments (Admin only)
// @route   GET /api/payments
// @access  Private (Admin)
router.get('/', protect, admin, getPayments);

// @desc    Get payment statistics (Admin only)
// @route   GET /api/payments/stats
// @access  Private (Admin)
router.get('/stats', protect, admin, getPaymentStats);

// @desc    Generate monthly payment records (Admin only)
// @route   POST /api/payments/generate
// @access  Private (Admin)
router.post('/generate', protect, admin, generateMonthlyPayments);

// Admin or Parent middleware
const adminOrParent = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'parent' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized - admin or parent access required');
  }
};

// @desc    Get payments for specific student (Admin & Parent)
// @route   GET /api/payments/student/:studentId
// @access  Private (Admin, Parent)
router.get('/student/:studentId', protect, adminOrParent, getStudentPayments);

// @desc    Create or update payment record (Admin only)
// @route   POST /api/payments
// @access  Private (Admin)
router.post('/', protect, admin, createOrUpdatePayment);

// @desc    Update payment record (Admin only)
// @route   PUT /api/payments/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, updatePayment);

// @desc    Delete payment record (Admin only)
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
router.delete('/:id', protect, admin, deletePayment);

module.exports = router;
