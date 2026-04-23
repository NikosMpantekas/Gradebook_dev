const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    day:       { type: String, required: true },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    slots:     [slotSchema],
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    rank:        { type: Number, required: true },
    score:       { type: Number, required: true },
    assignments: [assignmentSchema],
    violations:  [{ type: String }],
    summary:     { type: String, default: '' },
  },
  { _id: false }
);

const weightsSchema = new mongoose.Schema(
  {
    preferredDays:    { type: Number, default: 1.0 },
    avoidLateHours:   { type: Number, default: 1.0 },
    minimizeGaps:     { type: Number, default: 1.0 },
    teacherStability: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const scheduleRunSchema = new mongoose.Schema(
  {
    schoolId:   { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    classIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    options: {
      candidateCount: { type: Number, min: 1, max: 5, default: 3 },
      weights: weightsSchema,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'applied'],
      default: 'pending',
      index: true,
    },
    candidates:           [candidateSchema],
    appliedCandidateRank: { type: Number, default: null },
    errorMessage:         { type: String,  default: null },
  },
  { timestamps: true }
);

scheduleRunSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('ScheduleRun', scheduleRunSchema);
