/**
 * Schedule Scorer — soft constraints.
 * Higher score = better candidate.
 */

const { timeToMinutes } = require('./candidateSlotGenerator');

const LATE_THRESHOLD_MIN  = timeToMinutes('17:00');
const VERY_LATE_MIN       = timeToMinutes('19:00');
const BASE_SCORE          = 100;

/**
 * Score a candidate (array of assignments) against soft constraints.
 *
 * @param {Array}  assignments    - [{classId, slots, teacherId}]
 * @param {Object} classDataMap   - { classId: classDoc }
 * @param {Object} teacherDataMap - { teacherId: userDoc }
 * @param {Object} weights        - {preferredDays, avoidLateHours, minimizeGaps, teacherStability}
 * @returns {number} score
 */
const scoreCandidate = (assignments, classDataMap, teacherDataMap, weights = {}) => {
  const w = {
    preferredDays:    weights.preferredDays    ?? 1.0,
    avoidLateHours:   weights.avoidLateHours   ?? 1.0,
    minimizeGaps:     weights.minimizeGaps     ?? 1.0,
    teacherStability: weights.teacherStability ?? 1.0,
  };

  let score = BASE_SCORE;

  // Timeline per teacher for gap calculation
  const teacherDaySlots = {}; // { teacherId: { day: [startMin, ...] } }

  for (const asgn of assignments) {
    const cls = classDataMap[asgn.classId.toString()];
    if (!cls) continue;
    const cfg = cls.schedulingConfig || {};
    const preferredDays = new Set(cfg.preferredDays || []);

    for (const slot of asgn.slots) {
      const startMin = timeToMinutes(slot.startTime);
      const endMin   = timeToMinutes(slot.endTime);

      // +10 per session that lands on a preferred day
      if (preferredDays.size > 0 && preferredDays.has(slot.day)) {
        score += 10 * w.preferredDays;
      }

      // Penalty for late hours
      if (endMin > VERY_LATE_MIN) {
        score -= 12 * w.avoidLateHours;
      } else if (startMin >= LATE_THRESHOLD_MIN) {
        score -= 6 * w.avoidLateHours;
      }

      // Preferred days from assigned teacher
      if (asgn.teacherId) {
        const teacher = teacherDataMap[asgn.teacherId.toString()];
        const prefs = teacher?.schedulingAvailability?.preferences || {};
        if (prefs.preferredDays && prefs.preferredDays.includes(slot.day)) score += 5 * w.teacherStability;
        if (prefs.avoidDays     && prefs.avoidDays.includes(slot.day))     score -= 8 * w.teacherStability;
      }

      // Accumulate for gap check
      if (asgn.teacherId) {
        const tid = asgn.teacherId.toString();
        if (!teacherDaySlots[tid]) teacherDaySlots[tid] = {};
        if (!teacherDaySlots[tid][slot.day]) teacherDaySlots[tid][slot.day] = [];
        teacherDaySlots[tid][slot.day].push({ startMin, endMin });
      }
    }

    // +5 if the first teacher in the class is the same as the assigned teacher (stability)
    const firstTeacher = cls.teachers && cls.teachers[0];
    if (firstTeacher && asgn.teacherId) {
      const ftId = (firstTeacher._id || firstTeacher).toString();
      if (ftId === asgn.teacherId.toString()) score += 5 * w.teacherStability;
    }
  }

  // Gap penalty: for each teacher, sum gaps between consecutive sessions on the same day
  for (const [, dayMap] of Object.entries(teacherDaySlots)) {
    for (const [, timeSlots] of Object.entries(dayMap)) {
      const sorted = timeSlots.slice().sort((a, b) => a.startMin - b.startMin);
      for (let i = 1; i < sorted.length; i++) {
        const gapMin = sorted[i].startMin - sorted[i - 1].endMin;
        if (gapMin > 0) {
          score -= (gapMin / 30) * 2 * w.minimizeGaps;
        }
      }
    }
  }

  return Math.round(score * 10) / 10;
};

module.exports = { scoreCandidate };
