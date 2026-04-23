/**
 * generateTopSchedules — main orchestrator.
 * Loads class + user data, generates combinations, checks constraints,
 * scores them, and returns the top N ranked candidates.
 */

const Class = require('../../models/classModel');
const User  = require('../../models/userModel');
const { generateValidSlotsForClass, generateSlotSets } = require('./candidateSlotGenerator');
const { checkAllConstraints } = require('./constraintChecker');
const { scoreCandidate } = require('./scoreSchedule');

const MAX_SLOT_SETS_PER_CLASS = 20;
const MAX_ATTEMPTS            = 500;

/**
 * @param {string[]} classIds       - IDs of classes to schedule
 * @param {object}  options         - { candidateCount, weights }
 * @param {string}  schoolId        - for scoping DB queries
 * @returns {object[]} top N ranked candidates
 */
const generateTopSchedules = async (classIds, options = {}, schoolId) => {
  const candidateCount = Math.min(Math.max(options.candidateCount || 3, 1), 5);
  const weights = options.weights || {};

  console.log(`[Scheduler] Starting run: ${classIds.length} classes, ${candidateCount} candidates requested`);

  // ── 1. Load classes ────────────────────────────────────────────────────────
  const classes = await Class.find({ _id: { $in: classIds }, schoolId, active: true })
    .populate('teachers', 'name schedulingAvailability')
    .populate('students', 'name schedulingAvailability')
    .lean();

  if (classes.length === 0) throw new Error('No active classes found for the given IDs');

  // ── 2. Build availability maps ─────────────────────────────────────────────
  const teacherAvailMap = {};
  const studentAvailMap = {};
  const teacherNameMap  = {};
  const studentNameMap  = {};

  for (const cls of classes) {
    for (const t of cls.teachers || []) {
      teacherAvailMap[t._id.toString()] = t.schedulingAvailability || {};
      teacherNameMap[t._id.toString()]  = t.name;
    }
    for (const s of cls.students || []) {
      studentAvailMap[s._id.toString()] = s.schedulingAvailability || {};
      studentNameMap[s._id.toString()]  = s.name;
    }
  }

  // ── 3. Build class-level lookup maps ──────────────────────────────────────
  const classDataMap    = {};
  const classTeacherMap = {}; // classId → [teacherId]
  const classStudentMap = {}; // classId → [studentId]
  const classSlotSets   = {}; // classId → slot set array

  for (const cls of classes) {
    const cid = cls._id.toString();
    classDataMap[cid]    = cls;
    classTeacherMap[cid] = (cls.teachers || []).map((t) => t._id.toString());
    classStudentMap[cid] = (cls.students || []).map((s) => s._id.toString());

    const sessionsPerWeek = cls.schedulingConfig?.sessionsPerWeek || 1;
    const validSlots = generateValidSlotsForClass(cls, teacherAvailMap, studentAvailMap);

    if (validSlots.length === 0) {
      console.warn(`[Scheduler] No valid slots for class "${cls.name}" — using fallback open-window slots`);
    }

    classSlotSets[cid] = generateSlotSets(validSlots, sessionsPerWeek, MAX_SLOT_SETS_PER_CLASS);

    if (classSlotSets[cid].length === 0) {
      // Fallback: generate unconstrained slots (ignore availability, use default window)
      const fallbackSlots = generateValidSlotsForClass(cls, {}, {});
      classSlotSets[cid] = generateSlotSets(fallbackSlots, sessionsPerWeek, MAX_SLOT_SETS_PER_CLASS);
      console.warn(`[Scheduler] Using fallback slots for class "${cls.name}": ${classSlotSets[cid].length} sets`);
    }
  }

  // ── 4. Build teacher data map for scoring ──────────────────────────────────
  const teacherIds   = [...new Set(Object.values(classTeacherMap).flat())];
  const teacherDocs  = await User.find({ _id: { $in: teacherIds } }).select('name schedulingAvailability').lean();
  const teacherDataMap = {};
  for (const t of teacherDocs) teacherDataMap[t._id.toString()] = t;

  // ── 5. Generate candidate combinations ────────────────────────────────────
  const nameMap = { teachers: teacherNameMap, students: studentNameMap };
  const validCandidates = [];
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    const assignments = classes.map((cls) => {
      const cid = cls._id.toString();
      const sets = classSlotSets[cid];
      if (!sets || sets.length === 0) return null;
      const slotSet = sets[attempts % sets.length]; // rotate through available sets
      const primaryTeacher = classTeacherMap[cid]?.[0] || null;
      return { classId: cls._id, slots: slotSet, teacherId: primaryTeacher };
    }).filter(Boolean);

    if (assignments.length < classes.length) continue; // some class had no slots

    const { valid, violations } = checkAllConstraints(
      assignments, classTeacherMap, classStudentMap, classDataMap, nameMap
    );

    if (valid) {
      const score = scoreCandidate(assignments, classDataMap, teacherDataMap, weights);

      // Deduplicate: skip if identical set of class→slot mappings already collected
      const fingerprint = assignments
        .map((a) => `${a.classId}:${(a.slots || []).map((s) => `${s.day}@${s.startTime}`).sort().join(',')}`)
        .sort()
        .join('|');

      if (!validCandidates.some((c) => c.fingerprint === fingerprint)) {
        validCandidates.push({ assignments, score, violations, fingerprint });
      }
    }

    if (validCandidates.length >= candidateCount * 3) break; // enough unique valids found
  }

  console.log(`[Scheduler] Found ${validCandidates.length} valid candidates in ${attempts} attempts`);

  // ── 6. Sort and pick top N ─────────────────────────────────────────────────
  validCandidates.sort((a, b) => b.score - a.score);
  const top = validCandidates.slice(0, candidateCount);

  return top.map((c, i) => ({
    rank:        i + 1,
    score:       c.score,
    assignments: c.assignments,
    violations:  c.violations,
    summary: `Score ${c.score} — ${c.assignments.length} classes scheduled, ${c.violations.length} warning(s)`,
  }));
};

module.exports = { generateTopSchedules };
