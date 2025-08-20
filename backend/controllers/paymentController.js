const asyncHandler = require('express-async-handler');
const Payment = require('../models/paymentModel');
const User = require('../models/userModel');

// @desc    Get all payments for school (Admin only)
// @route   GET /api/payments
// @access  Private (Admin)
const getPayments = asyncHandler(async (req, res) => {
  const { status, student, period, month, year } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build query
  let query = { schoolId: req.user.schoolId };

  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (student) {
    query.student = student;
  }
  
  if (period) {
    query.paymentPeriod = period;
  } else if (month && year) {
    query.paymentPeriod = Payment.generatePaymentPeriod(parseInt(year), parseInt(month));
  }

  const payments = await Payment.find(query)
    .populate('student', 'name email')
    .populate('recordedBy', 'name')
    .sort({ paymentPeriod: -1, 'student.name': 1 })
    .skip(skip)
    .limit(limit);

  const total = await Payment.countDocuments(query);

  res.status(200).json({
    payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get payment history for a specific student (Admin & Parent)
// @route   GET /api/payments/student/:studentId
// @access  Private (Admin, Parent)
const getStudentPayments = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { year } = req.query;

  // Check authorization
  if (req.user.role === 'parent') {
    // Check if parent is linked to this student
    const student = await User.findById(studentId);
    if (!student || !student.parentIds?.includes(req.user._id)) {
      res.status(403);
      throw new Error('Not authorized to view this student\'s payments');
    }
  }

  // Build query
  let query = { 
    student: studentId, 
    schoolId: req.user.schoolId 
  };

  if (year) {
    query.paymentPeriod = { $regex: `^${year}-` };
  }

  const payments = await Payment.find(query)
    .populate('recordedBy', 'name')
    .sort({ paymentPeriod: -1 });

  res.status(200).json(payments);
});

// @desc    Create or update payment record (Admin only)
// @route   POST /api/payments
// @access  Private (Admin)
const createOrUpdatePayment = asyncHandler(async (req, res) => {
  const { studentId, paymentPeriod, status, paymentMethod, notes } = req.body;

  if (!studentId || !paymentPeriod) {
    res.status(400);
    throw new Error('Student ID and payment period are required');
  }

  // Verify student exists and belongs to same school
  const student = await User.findById(studentId);
  if (!student || student.schoolId.toString() !== req.user.schoolId.toString()) {
    res.status(404);
    throw new Error('Student not found');
  }

  if (student.role !== 'student') {
    res.status(400);
    throw new Error('Invalid student ID');
  }

  // Calculate due date (15th of the payment month)
  const [year, month] = paymentPeriod.split('-');
  const dueDate = new Date(parseInt(year), parseInt(month) - 1, 15);

  // Check if payment record exists
  let payment = await Payment.findOne({
    student: studentId,
    paymentPeriod,
    schoolId: req.user.schoolId
  });

  if (payment) {
    // Update existing payment
    payment.status = status || payment.status;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.notes = notes || payment.notes;
    
    if (status === 'paid' && !payment.paidDate) {
      payment.paidDate = new Date();
      payment.recordedBy = req.user._id;
    }
    
    await payment.save();
  } else {
    // Create new payment record
    payment = await Payment.create({
      student: studentId,
      schoolId: req.user.schoolId,
      paymentPeriod,
      status: status || 'pending',
      dueDate,
      paymentMethod,
      notes,
      paidDate: status === 'paid' ? new Date() : null,
      recordedBy: status === 'paid' ? req.user._id : undefined
    });
  }

  await payment.populate('student', 'name email');
  await payment.populate('recordedBy', 'name');

  res.status(201).json(payment);
});

// @desc    Update payment status (Admin only)
// @route   PUT /api/payments/:id
// @access  Private (Admin)
const updatePayment = asyncHandler(async (req, res) => {
  const { status, paymentMethod, notes } = req.body;
  
  const payment = await Payment.findById(req.params.id);
  
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  // Verify payment belongs to same school
  if (payment.schoolId.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this payment');
  }

  // Update fields
  if (status) payment.status = status;
  if (paymentMethod) payment.paymentMethod = paymentMethod;
  if (notes !== undefined) payment.notes = notes;
  
  // Set paid date and recorded by if marking as paid
  if (status === 'paid' && !payment.paidDate) {
    payment.paidDate = new Date();
    payment.recordedBy = req.user._id;
  }

  await payment.save();
  await payment.populate('student', 'name email');
  await payment.populate('recordedBy', 'name');

  res.status(200).json(payment);
});

// @desc    Delete payment record (Admin only)
// @route   DELETE /api/payments/:id
// @access  Private (Admin)
const deletePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  
  if (!payment) {
    res.status(404);
    throw new Error('Payment record not found');
  }

  // Verify payment belongs to same school
  if (payment.schoolId.toString() !== req.user.schoolId.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this payment');
  }

  await Payment.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Payment record deleted successfully' });
});

// @desc    Generate payment records for all students for a specific month (Admin only)
// @route   POST /api/payments/generate
// @access  Private (Admin)
const generateMonthlyPayments = asyncHandler(async (req, res) => {
  const { year, month } = req.body;
  
  if (!year || !month) {
    res.status(400);
    throw new Error('Year and month are required');
  }

  const paymentPeriod = Payment.generatePaymentPeriod(year, month);
  
  // Get all students in the school
  const students = await User.find({ 
    role: 'student', 
    schoolId: req.user.schoolId 
  });

  // Calculate due date (15th of the payment month)
  const dueDate = new Date(year, month - 1, 15);

  const paymentPromises = students.map(async (student) => {
    // Check if payment record already exists
    const existingPayment = await Payment.findOne({
      student: student._id,
      paymentPeriod,
      schoolId: req.user.schoolId
    });

    if (!existingPayment) {
      return Payment.create({
        student: student._id,
        schoolId: req.user.schoolId,
        paymentPeriod,
        status: 'pending',
        dueDate
      });
    }
    
    return existingPayment;
  });

  const payments = await Promise.all(paymentPromises);
  const newPaymentsCount = payments.filter(payment => payment.isNew !== false).length;

  res.status(201).json({
    message: `Generated ${newPaymentsCount} new payment records for ${Payment.parsePaymentPeriod(paymentPeriod).monthName} ${year}`,
    paymentPeriod,
    totalStudents: students.length,
    newRecords: newPaymentsCount
  });
});

// @desc    Get payment statistics (Admin only)
// @route   GET /api/payments/stats
// @access  Private (Admin)
const getPaymentStats = asyncHandler(async (req, res) => {
  const { period } = req.query;
  
  let matchQuery = { schoolId: req.user.schoolId };
  
  if (period) {
    matchQuery.paymentPeriod = period;
  }

  const stats = await Payment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    paid: 0,
    pending: 0,
    overdue: 0,
    total: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  res.status(200).json(result);
});

module.exports = {
  getPayments,
  getStudentPayments,
  createOrUpdatePayment,
  updatePayment,
  deletePayment,
  generateMonthlyPayments,
  getPaymentStats
};
