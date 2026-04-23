/**
 * Candidate Slot Generator
 * Produces valid {day, startTime, endTime} slots for a class based on
 * teacher/student availability and class schedulingConfig.
 */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_RESOLUTION_MIN = 30; // grid resolution for start-time candidates

/** "HH:MM" → minutes since midnight */
const timeToMinutes = (t) => {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** minutes since midnight → "HH:MM" */
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** True if [sMin, eMin) overlaps any window in the array */
const isWithinAnyWindow = (sMin, eMin, windows) => {
  if (!windows || windows.length === 0) return true; // no windows = always available
  return windows.some(
    (w) => timeToMinutes(w.startTime) <= sMin && eMin <= timeToMinutes(w.endTime)
  );
};

/** True if two {day, startMin, endMin} slots overlap */
const slotsOverlap = (a, b) => {
  if (a.day !== b.day) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
};

/**
 * Generate ALL valid individual slots for one class, considering:
 *  - each teacher's availability on each day
 *  - each student's availability on each day
 *  - class preferredTimeWindows (if any)
 *  - class preferredDays (if any)
 *  - global earliestStart / latestEnd from user preferences
 */
const generateValidSlotsForClass = (cls, teacherAvailMap, studentAvailMap) => {
  const cfg = cls.schedulingConfig || {};
  const durationMin = cfg.sessionDurationMinutes || 60;
  const preferredDays = cfg.preferredDays && cfg.preferredDays.length > 0 ? cfg.preferredDays : DAYS;
  const preferredWindows = cfg.preferredTimeWindows && cfg.preferredTimeWindows.length > 0
    ? cfg.preferredTimeWindows : null;

  // Gather global earliest/latest from teacher preferences (strictest wins)
  let globalEarliest = 480; // 08:00
  let globalLatest   = 1260; // 21:00

  const teacherIds  = (cls.teachers || []).map((t) => (t._id || t).toString());
  const studentIds  = (cls.students || []).map((s) => (s._id || s).toString());

  teacherIds.forEach((tid) => {
    const avail = teacherAvailMap[tid];
    if (!avail) return;
    const prefs = avail.preferences || {};
    if (prefs.earliestStart) globalEarliest = Math.max(globalEarliest, timeToMinutes(prefs.earliestStart));
    if (prefs.latestEnd)     globalLatest   = Math.min(globalLatest,   timeToMinutes(prefs.latestEnd));
  });

  const validSlots = [];

  preferredDays.forEach((day) => {
    // Collect availability windows per teacher and student for this day
    const teacherWindows = teacherIds.map((tid) => {
      const avail = teacherAvailMap[tid];
      return avail && avail.weeklyWindows ? (avail.weeklyWindows[day] || []) : [];
    });
    const studentWindows = studentIds.map((sid) => {
      const avail = studentAvailMap[sid];
      return avail && avail.weeklyWindows ? (avail.weeklyWindows[sid] || avail.weeklyWindows[day] || []) : [];
    });

    // Try all possible start times on this day
    for (let startMin = globalEarliest; startMin + durationMin <= globalLatest; startMin += SLOT_RESOLUTION_MIN) {
      const endMin = startMin + durationMin;

      // Must fit within class preferred time windows (if specified)
      if (preferredWindows && !isWithinAnyWindow(startMin, endMin, preferredWindows)) continue;

      // Must fit within EVERY teacher's windows (if they have windows set)
      const teacherOk = teacherWindows.every((windows) => isWithinAnyWindow(startMin, endMin, windows));
      if (!teacherOk) continue;

      // Must fit within EVERY student's windows (if they have windows set)
      const studentOk = studentWindows.every((windows) => isWithinAnyWindow(startMin, endMin, windows));
      if (!studentOk) continue;

      validSlots.push({ day, startTime: minutesToTime(startMin), endTime: minutesToTime(endMin), startMin, endMin });
    }
  });

  console.log(`[SlotGenerator] Class "${cls.name}": ${validSlots.length} valid raw slots`);
  return validSlots;
};

/**
 * From a list of valid individual slots, produce multiple slot-SET candidates
 * where each set contains `sessionsPerWeek` slots with no two on the same day.
 * Uses shuffle-based sampling to produce variety.
 */
const generateSlotSets = (slots, sessionsPerWeek, targetCount = 20, seed = 0) => {
  if (slots.length === 0) return [];
  const sets = [];
  const MAX_ATTEMPTS = targetCount * 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS && sets.length < targetCount; attempt++) {
    // Fisher-Yates shuffle with a simple pseudo-random based on attempt
    const shuffled = [...slots];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs(((attempt * 1103515245 + i * 12345) & 0x7fffffff)) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const picked = [];
    const usedDays = new Set();
    for (const slot of shuffled) {
      if (!usedDays.has(slot.day)) {
        picked.push(slot);
        usedDays.add(slot.day);
        if (picked.length === sessionsPerWeek) break;
      }
    }

    if (picked.length === sessionsPerWeek) {
      // Check for duplicates by stringifying the sorted slot set
      const key = picked
        .slice()
        .sort((a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime))
        .map((s) => `${s.day}@${s.startTime}`)
        .join('|');

      if (!sets.some((s) => s.key === key)) {
        sets.push({ slots: picked, key });
      }
    }
  }

  return sets.map((s) => s.slots);
};

module.exports = { timeToMinutes, minutesToTime, slotsOverlap, generateValidSlotsForClass, generateSlotSets };
