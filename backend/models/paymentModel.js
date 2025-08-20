const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
  {
    // Student reference
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true
    },
    
    // School association for multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },
    
    // Payment period (year-month format: 2024-09)
    paymentPeriod: {
      type: String,
      required: [true, 'Payment period is required'],
      match: /^\d{4}-\d{2}$/, // Format: YYYY-MM
      index: true
    },
    
    // Payment status
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
      required: true
    },
    
    // Date when payment was marked as paid
    paidDate: {
      type: Date,
      default: null
    },
    
    // Due date for the payment (calculated based on school settings)
    dueDate: {
      type: Date,
      required: true
    },
    
    // Admin who recorded the payment
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.status === 'paid';
      }
    },
    
    // Optional notes
    notes: {
      type: String,
      default: '',
      maxlength: 500
    },
    
    // Payment method (optional)
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'check', 'other'],
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
paymentSchema.index({ student: 1, paymentPeriod: 1, schoolId: 1 }, { unique: true });

// Index for school-based queries
paymentSchema.index({ schoolId: 1, paymentPeriod: 1 });

// Index for status-based queries
paymentSchema.index({ status: 1, dueDate: 1 });

// Virtual for display month name
paymentSchema.virtual('displayMonth').get(function() {
  if (!this.paymentPeriod) return '';
  
  const [year, month] = this.paymentPeriod.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[parseInt(month) - 1]} ${year}`;
});

// Virtual for checking if payment is overdue
paymentSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Pre-save middleware to update status based on due date
paymentSchema.pre('save', function(next) {
  if (this.status === 'pending' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

// Static method to generate payment period string
paymentSchema.statics.generatePaymentPeriod = function(year, month) {
  return `${year}-${month.toString().padStart(2, '0')}`;
};

// Static method to get current payment period
paymentSchema.statics.getCurrentPaymentPeriod = function() {
  const now = new Date();
  return this.generatePaymentPeriod(now.getFullYear(), now.getMonth() + 1);
};

// Static method to parse payment period
paymentSchema.statics.parsePaymentPeriod = function(period) {
  const [year, month] = period.split('-');
  return {
    year: parseInt(year),
    month: parseInt(month),
    monthName: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][parseInt(month) - 1]
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
