/**
 * Constraint Checker
 * Hard constraints: teacher overlap, student overlap, locked groups, forbidden pairs.
 * Returns { valid: bool, violations: string[] }
 */

const { slotsOverlap } = require('./candidateSlotGenerator');

/**
 * Build a map: teacherId → [{day, startMin, endMin, classId}] from assignments
 */
const buildTeacherTimeline = (assignments, classTeacherMap) => {
  const timeline = {};
  for (const asgn of assignments) {
    const teacherIds = classTeacherMap[asgn.classId.toString()] || [];
    for (const tid of teacherIds) {
      if (!timeline[tid]) timeline[tid] = [];
      for (const slot of asgn.slots) {
        timeline[tid].push({ ...slot, classId: asgn.classId });
      }
    }
  }
  return timeline;
};

/**
 * Build a map: studentId → [{day, startMin, endMin, classId}] from assignments
 */
const buildStudentTimeline = (assignments, classStudentMap) => {
  const timeline = {};
  for (const asgn of assignments) {
    const studentIds = classStudentMap[asgn.classId.toString()] || [];
    for (const sid of studentIds) {
      if (!timeline[sid]) timeline[sid] = [];
      for (const slot of asgn.slots) {
        timeline[sid].push({ ...slot, classId: asgn.classId });
      }
    }
  }
  return timeline;
};

/** Find pairwise overlaps in a list of slots (for one person) */
const findOverlapsInTimeline = (slots) => {
  const overlaps = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (slotsOverlap(slots[i], slots[j])) {
        overlaps.push({ a: slots[i], b: slots[j] });
      }
    }
  }
  return overlaps;
};

/**
 * Check teacher double-booking across classes.
 */
const checkTeacherOverlap = (assignments, classTeacherMap, teacherNameMap = {}) => {
  const violations = [];
  const timeline = buildTeacherTimeline(assignments, classTeacherMap);

  for (const [tid, slots] of Object.entries(timeline)) {
    const overlaps = findOverlapsInTimeline(slots);
    for (const { a, b } of overlaps) {
      const name = teacherNameMap[tid] || tid;
      violations.push(
        `HARD: Teacher "${name}" is double-booked: ${a.day} ${a.startTime}-${a.endTime} conflicts with ${b.day} ${b.startTime}-${b.endTime}`
      );
    }
  }
  return violations;
};

/**
 * Check student double-booking across classes.
 */
const checkStudentOverlap = (assignments, classStudentMap, studentNameMap = {}) => {
  const violations = [];
  const timeline = buildStudentTimeline(assignments, classStudentMap);

  for (const [sid, slots] of Object.entries(timeline)) {
    const overlaps = findOverlapsInTimeline(slots);
    for (const { a, b } of overlaps) {
      const name = studentNameMap[sid] || sid;
      violations.push(
        `HARD: Student "${name}" is double-booked: ${a.day} ${a.startTime}-${a.endTime} conflicts with ${b.day} ${b.startTime}-${b.endTime}`
      );
    }
  }
  return violations;
};

/**
 * Check locked student groups: all students in a group should be in the same class.
 * (Soft violation — we report it but can't fully enforce here since enrollment is separate.)
 */
const checkLockedGroups = (classDataMap) => {
  const violations = [];
  for (const [classId, cls] of Object.entries(classDataMap)) {
    const cfg = cls.schedulingConfig || {};
    const groups = cfg.lockedStudentGroups || [];
    const enrolledIds = new Set((cls.students || []).map((s) => (s._id || s).toString()));

    groups.forEach((group, gi) => {
      const notEnrolled = group.filter((sid) => !enrolledIds.has(sid.toString()));
      if (notEnrolled.length > 0) {
        violations.push(
          `WARN: Locked group ${gi + 1} in class "${cls.name}" has students not enrolled in this class`
        );
      }
    });
  }
  return violations;
};

/**
 * Check forbidden pairs: two students should not be in the same class.
 */
const checkForbiddenPairs = (classDataMap) => {
  const violations = [];
  for (const [, cls] of Object.entries(classDataMap)) {
    const cfg = cls.schedulingConfig || {};
    const pairs = cfg.forbiddenStudentPairs || [];
    const enrolledIds = new Set((cls.students || []).map((s) => (s._id || s).toString()));

    pairs.forEach(([a, b]) => {
      if (enrolledIds.has(a.toString()) && enrolledIds.has(b.toString())) {
        violations.push(
          `WARN: Forbidden pair are both enrolled in class "${cls.name}" — cannot separate via scheduling alone`
        );
      }
    });
  }
  return violations;
};

/**
 * Run ALL hard + warning constraints.
 * Returns { hardViolations: string[], warnings: string[], valid: bool }
 */
const checkAllConstraints = (assignments, classTeacherMap, classStudentMap, classDataMap, nameMap = {}) => {
  const hard = [
    ...checkTeacherOverlap(assignments, classTeacherMap, nameMap.teachers || {}),
    ...checkStudentOverlap(assignments, classStudentMap, nameMap.students || {}),
  ];

  const warnings = [
    ...checkLockedGroups(classDataMap),
    ...checkForbiddenPairs(classDataMap),
  ];

  return {
    valid: hard.length === 0,
    hardViolations: hard,
    warnings,
    violations: [...hard, ...warnings],
  };
};

module.exports = { checkAllConstraints };
