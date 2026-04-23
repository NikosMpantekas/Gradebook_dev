const asyncHandler = require('express-async-handler');
const ScheduleRun  = require('../models/scheduleRunModel');
const Class        = require('../models/classModel');
const User         = require('../models/userModel');
const { generateTopSchedules } = require('../services/scheduler/generateTopSchedules');

// ── Helper: scope guard ───────────────────────────────────────────────────────
const assertAdmin = (req) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
};

// ── POST /api/schedule-runs/generate ─────────────────────────────────────────
const generateRun = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { classIds, candidateCount = 3, weights = {} } = req.body;

  if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
    res.status(400);
    throw new Error('classIds array is required');
  }

  const clampedCount = Math.min(Math.max(Number(candidateCount), 1), 5);
  console.log(`[ScheduleRun] Generate requested by ${req.user._id} for ${classIds.length} classes`);

  const run = await ScheduleRun.create({
    schoolId:  req.user.schoolId,
    createdBy: req.user._id,
    classIds,
    options:   { candidateCount: clampedCount, weights },
    status:    'running',
  });

  try {
    const candidates = await generateTopSchedules(classIds, { candidateCount: clampedCount, weights }, req.user.schoolId);

    run.candidates = candidates;
    run.status     = candidates.length > 0 ? 'completed' : 'failed';
    if (candidates.length === 0) run.errorMessage = 'No valid candidate schedules could be generated. Check availability windows.';
    await run.save();

    console.log(`[ScheduleRun] Run ${run._id} completed with ${candidates.length} candidates`);
    res.status(201).json({ success: true, run });
  } catch (err) {
    run.status       = 'failed';
    run.errorMessage = err.message;
    await run.save();
    console.error(`[ScheduleRun] Run ${run._id} failed:`, err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/schedule-runs ────────────────────────────────────────────────────
const listRuns = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const runs = await ScheduleRun.find({ schoolId: req.user.schoolId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('createdBy', 'name')
    .populate('classIds', 'name subject')
    .lean();

  res.json({ success: true, runs });
});

// ── GET /api/schedule-runs/:id ────────────────────────────────────────────────
const getRun = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const run = await ScheduleRun.findOne({ _id: req.params.id, schoolId: req.user.schoolId })
    .populate('createdBy', 'name')
    .populate('classIds',  'name subject')
    .lean();

  if (!run) { res.status(404); throw new Error('Schedule run not found'); }
  res.json({ success: true, run });
});

// ── POST /api/schedule-runs/:id/apply/:rank ───────────────────────────────────
const applyCandidate = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { id, rank } = req.params;
  const rankNum = Number(rank);

  const run = await ScheduleRun.findOne({ _id: id, schoolId: req.user.schoolId });
  if (!run) { res.status(404); throw new Error('Schedule run not found'); }
  if (run.status === 'applied') { res.status(400); throw new Error('This run has already been applied'); }

  const candidate = run.candidates.find((c) => c.rank === rankNum);
  if (!candidate) { res.status(404); throw new Error(`Candidate with rank ${rankNum} not found`); }

  console.log(`[ScheduleRun] Applying rank ${rankNum} from run ${id} — ${candidate.assignments.length} class(es)`);

  // Write chosen schedule back into each Class.schedule (preserving existing format)
  const updatedClasses = [];
  for (const asgn of candidate.assignments) {
    const newSchedule = (asgn.slots || []).map((s) => ({
      day:       s.day,
      startTime: s.startTime,
      endTime:   s.endTime,
    }));

    const cls = await Class.findOneAndUpdate(
      { _id: asgn.classId, schoolId: req.user.schoolId },
      { $set: { schedule: newSchedule } },
      { new: true }
    );
    if (cls) updatedClasses.push({ classId: cls._id, name: cls.name, schedule: newSchedule });
  }

  run.status               = 'applied';
  run.appliedCandidateRank = rankNum;
  await run.save();

  console.log(`[ScheduleRun] Applied ${updatedClasses.length} class schedules`);
  res.json({ success: true, updatedClasses, run });
});

// ── PUT /api/schedule-runs/availability/:userId ───────────────────────────────
const updateUserAvailability = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  const { schedulingAvailability } = req.body;

  if (!schedulingAvailability) { res.status(400); throw new Error('schedulingAvailability is required'); }

  const user = await User.findOneAndUpdate(
    { _id: userId, schoolId: req.user.schoolId },
    { $set: { schedulingAvailability } },
    { new: true }
  ).select('name role schedulingAvailability');

  if (!user) { res.status(404); throw new Error('User not found in your school'); }
  console.log(`[ScheduleRun] Updated availability for user ${userId}`);
  res.json({ success: true, user });
});

// ── PUT /api/schedule-runs/class-config/:classId ──────────────────────────────
const updateClassConfig = asyncHandler(async (req, res) => {
  assertAdmin(req);
  const { classId } = req.params;
  const { schedulingConfig } = req.body;

  if (!schedulingConfig) { res.status(400); throw new Error('schedulingConfig is required'); }

  const cls = await Class.findOneAndUpdate(
    { _id: classId, schoolId: req.user.schoolId },
    { $set: { schedulingConfig } },
    { new: true }
  ).select('name subject schedulingConfig');

  if (!cls) { res.status(404); throw new Error('Class not found in your school'); }
  console.log(`[ScheduleRun] Updated schedulingConfig for class ${classId}`);
  res.json({ success: true, class: cls });
});

module.exports = { generateRun, listRuns, getRun, applyCandidate, updateUserAvailability, updateClassConfig };
