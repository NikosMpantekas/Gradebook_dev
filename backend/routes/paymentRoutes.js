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
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// @desc    Get all payments (Admin only)
// @route   GET /api/payments
// @access  Private (Admin)
router.get('/', protect, requireRole(['admin']), getPayments);

// @desc    Get payment statistics (Admin only)
// @route   GET /api/payments/stats
// @access  Private (Admin)
router.get('/stats', protect, requireRole(['admin']), getPaymentStats);

// @desc    Generate monthly payment records (Admin only)
// @route   POST /api/payments/generate
// @access  Private (Admin)
router.post('/generate', protect, requireRole(['admin']), generateMonthlyPayments);

// @desc    Get payments for specific student (Admin & Parent)
// @route   GET /api/payments/student/:studentId
// @access  Private (Admin, Parent)
router.get('/student/:studentId', protect, requireRole(['admin', 'parent']), getStudentPayments);

// @desc    Create or update payment record (Admin only)
// @route   POST /api/payments
// @access  Private (Admin)
router.post('/', protect, requireRole(['admin']), createOrUpdatePayment);

// @desc    Update payment record (Admin only)
// @route   PUT /api/payments/:id
// @access  Private (Admin)
router.put('/:id', protect, requireRole(['admin']), updatePayment);

// @desc    Delete payment record (Admin only)
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
router.delete('/:id', protect, requireRole(['admin']), deletePayment);

module.exports = router;
