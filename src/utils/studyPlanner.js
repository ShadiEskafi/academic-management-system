// src/utils/studyPlanner.js
// محرك خوارزمية التخطيط والجدولة الذكية (Smart Weekly Study Planning Engine)
// يستند إلى وثيقة Phase 06.5 - حاسبة الأولويات الخماسية الموزونة والتوزيع الدائري بـ pure JS

import { calculateSlotDurationMinutes, timeToMinutes } from '../api/availability.js';

export const DAYS_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const INDEX_TO_DAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * حساب درجة الأولوية الخماسية الموزونة لكل مادة (Weighted Priority Score)
 */
export function calculateCoursePriorityScore(course, { today = new Date(), exams = [], assignments = [], missedSessionsCount = 0 }) {
  const courseExams = exams.filter((e) => e.course_id === course.id);
  const courseAssignments = assignments.filter((a) => a.course_id === course.id && a.status !== 'completed');

  // 1. قرب الامتحان (35%)
  let examScore = 0;
  let minExamDays = 999;
  courseExams.forEach((e) => {
    if (e.exam_date) {
      const examDate = new Date(e.exam_date);
      const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < minExamDays) minExamDays = diffDays;
    }
  });

  if (minExamDays <= 2) examScore = 100;
  else if (minExamDays <= 7) examScore = Math.max(0, 80 - (minExamDays * 5));
  else if (minExamDays <= 14) examScore = 40;

  // 2. قرب الواجب/المشروع (15%)
  let assignScore = 0;
  let minAssignDays = 999;
  courseAssignments.forEach((a) => {
    if (a.due_date) {
      const dueDate = new Date(a.due_date);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < minAssignDays) minAssignDays = diffDays;
    }
  });

  if (minAssignDays <= 2) assignScore = 100;
  else if (minAssignDays <= 7) assignScore = Math.max(0, 75 - (minAssignDays * 5));
  else if (minAssignDays <= 14) assignScore = 30;

  // 3. صعوبة المساق (20%)
  let diffScore = 60; // medium default
  if (course.difficulty === 'hard') diffScore = 100;
  else if (course.difficulty === 'easy') diffScore = 30;

  // 4. المحتوى المتبقي (15%)
  const totalTopics = Number(course.totalTopics) || 0;
  const completedTopics = Number(course.completedTopics) || 0;
  let remScore = 50;
  if (totalTopics > 0) {
    remScore = Math.round((1 - (completedTopics / totalTopics)) * 100);
  }

  // 5. تعويض الجلسات الفائتة (15%)
  const missedScore = Math.min(100, (missedSessionsCount || 0) * 35);

  // حساب الحاصل الموزون النهائي
  const weightedExam = 0.35 * examScore;
  const weightedAssign = 0.15 * assignScore;
  const weightedDiff = 0.20 * diffScore;
  const weightedRem = 0.15 * remScore;
  const weightedMissed = 0.15 * missedScore;

  const totalScore = Math.round(weightedExam + weightedAssign + weightedDiff + weightedRem + weightedMissed);

  // تحديد العامل المهيمن (Dominant Factor) لشارة السبب (Reason Badge)
  const factors = [
    { key: 'exam', val: weightedExam, badgeText: '🎓 امتحان قريب', priority: 1 },
    { key: 'assign', val: weightedAssign, badgeText: '⚡ تسليم عاجل', priority: 2 },
    { key: 'diff', val: weightedDiff, badgeText: '🔥 صعوبة عالية', priority: 3 },
    { key: 'rem', val: weightedRem, badgeText: '📈 محتوى متبقي', priority: 4 },
    { key: 'missed', val: weightedMissed, badgeText: '🔄 تدارك تفويت', priority: 5 },
  ];

  factors.sort((a, b) => b.val - a.val || a.priority - b.priority);
  const dominant = factors[0];

  return {
    score: totalScore,
    dominantFactor: dominant.key,
    reasonBadgeText: dominant.badgeText,
    breakdown: { examScore, assignScore, diffScore, remScore, missedScore },
  };
}

/**
 * تجزئة فترات التفرغ الطويلة إلى فترات قياسية (Chunking: 45-60 min session + 15 min rest)
 */
export function chunkAvailabilitySlots(slots = []) {
  const chunks = [];

  slots.forEach((slot) => {
    const dayKey = slot.day_of_week;
    const startMin = timeToMinutes(slot.start_time);
    const endMin = timeToMinutes(slot.end_time);
    const totalMins = endMin - startMin;

    if (totalMins <= 0) return;

    if (totalMins <= 60) {
      // فترة قصيرة قياسية
      chunks.push({
        dayOfWeek: dayKey,
        startMinutes: startMin,
        endMinutes: endMin,
        durationMinutes: totalMins,
      });
    } else {
      // فترة طويلة تطلب تجزئة قياسية (مثلاً: 50 دقيقة دراسة + 15 دقيقة استراحة)
      let currStart = startMin;
      while (currStart + 45 <= endMin) {
        const currEnd = Math.min(currStart + 50, endMin);
        chunks.push({
          dayOfWeek: dayKey,
          startMinutes: currStart,
          endMinutes: currEnd,
          durationMinutes: currEnd - currStart,
        });
        currStart = currEnd + 15; // 15 دقيقة استراحة بين الشريحتين
      }
    }
  });

  return chunks.sort((a, b) => {
    const dayDiff = (DAYS_INDEX[a.dayOfWeek] ?? 99) - (DAYS_INDEX[b.dayOfWeek] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startMinutes - b.startMinutes;
  });
}

/**
 * تحويل دقيقة من بداية اليوم إلى نص وقت HH:MM (مثلاً 540 -> "09:00")
 */
export function minutesToTimeStr(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * حساب تاريخ بداية الأسبوع (الأحد) بالتوقيت المحلي الصريح
 */
export function getLocalWeekStartDate(dateInput = new Date()) {
  const d = new Date(dateInput);
  const dayIdx = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dayIdx);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * دمج تاريخ بداية الأسبوع مع يوم الأسبوع ودقائق البداية والنهاية بـ Local Timezone
 */
export function buildLocalDateTime(weekStartDate, dayOfWeekKey, minutesFromMidnight) {
  const targetDate = new Date(weekStartDate);
  const dayIdx = DAYS_INDEX[dayOfWeekKey] ?? 0;
  targetDate.setDate(targetDate.getDate() + dayIdx);

  const hours = Math.floor(minutesFromMidnight / 60);
  const mins = minutesFromMidnight % 60;
  targetDate.setHours(hours, mins, 0, 0);

  return targetDate;
}

/**
 * خوارزمية الجدولة التلقائية الذكية (Round-Robin with Daily Cap = 2)
 */
export function generateWeeklyPlanAlgorithm({
  weekStartDate,
  availabilitySlots = [],
  courses = [],
  exams = [],
  assignments = [],
  existingSessions = [],
}) {
  const today = new Date();
  const baseWeekStart = getLocalWeekStartDate(weekStartDate || today);

  // 1. حساب الأولويات لكل مادة
  const evaluatedCourses = courses.map((course) => {
    const evalResult = calculateCoursePriorityScore(course, { today, exams, assignments });
    return {
      ...course,
      priorityScore: evalResult.score,
      dominantFactor: evalResult.dominantFactor,
      reasonBadgeText: evalResult.reasonBadgeText,
    };
  });

  // ترتيب المواد تنازلياً حسب الأولوية
  evaluatedCourses.sort((a, b) => b.priorityScore - a.priorityScore);

  // 2. تجزئة فترات التفرغ
  const chunks = chunkAvailabilitySlots(availabilitySlots);

  // 3. تتبع السقف اليومي للجلسات للمادة الواحدة (Daily Cap = 2)
  const dailyCourseCounts = {}; // { 'sunday_courseId': count }

  // 4. الحفاظ على الجلسات المكتملة مسبقاً في هذا الأسبوع وعدم حذفها
  const preservedSessions = existingSessions.filter((s) => s.status === 'completed' || s.status === 'partially_completed');

  // تسجيل الجلسات المحفوظة لمنع التعارض الساعي
  const occupiedSlots = new Set();
  preservedSessions.forEach((s) => {
    const sStart = new Date(s.scheduled_start);
    const dayIdx = sStart.getDay();
    const dayKey = INDEX_TO_DAY[dayIdx];
    const startMins = sStart.getHours() * 60 + sStart.getMinutes();
    occupiedSlots.add(`${dayKey}_${startMins}`);
  });

  const generatedPlannedSessions = [];
  const underScheduledMap = {}; // تتبع الساعات المخصصة لكل مادة

  let courseIndex = 0;

  chunks.forEach((chunk) => {
    const dayKey = chunk.dayOfWeek;
    const slotKey = `${dayKey}_${chunk.startMinutes}`;

    // تخطي إذا كانت الفترة محجوزة بجلسة مكتملة مسبقاً (BR-8 Conflict)
    if (occupiedSlots.has(slotKey)) return;

    // البحث عن مادة مناسبة بالتوزيع الدائري (Round-Robin) لم تتجاوز السقف اليومي (dailyCap = 2)
    let selectedCourse = null;
    let attempts = 0;

    while (attempts < evaluatedCourses.length) {
      const candidate = evaluatedCourses[(courseIndex + attempts) % evaluatedCourses.length];
      const capKey = `${dayKey}_${candidate.id}`;
      const currentCount = dailyCourseCounts[capKey] || 0;

      if (currentCount < 2) {
        selectedCourse = candidate;
        dailyCourseCounts[capKey] = currentCount + 1;
        courseIndex = (courseIndex + attempts + 1) % evaluatedCourses.length;
        break;
      }

      attempts++;
    }

    if (selectedCourse) {
      const scheduledStart = buildLocalDateTime(baseWeekStart, dayKey, chunk.startMinutes);
      const scheduledEnd = buildLocalDateTime(baseWeekStart, dayKey, chunk.endMinutes);

      const targetTopic = selectedCourse.current_topic || {
        id: selectedCourse.current_position_topic_id || null,
        title: selectedCourse.current_position_topic_title || 'مذاكرة وتغطية المادة',
      };

      generatedPlannedSessions.push({
        course_id: selectedCourse.id,
        courseTitle: selectedCourse.title,
        courseColor: selectedCourse.color || '#6366f1',
        topic_id: targetTopic.id,
        topicTitle: targetTopic.title || 'مذاكرة وتغطية المادة',
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        status: 'planned',
        reasonBadgeText: selectedCourse.reasonBadgeText,
        durationMinutes: chunk.durationMinutes,
        dayOfWeek: dayKey,
        formattedTimeRange: `${minutesToTimeStr(chunk.startMinutes)} - ${minutesToTimeStr(chunk.endMinutes)}`,
      });

      underScheduledMap[selectedCourse.id] = (underScheduledMap[selectedCourse.id] || 0) + chunk.durationMinutes;
    }
  });

  // تقرير النقص الزمني للمواد ذات الأولوية العالية التي لم تحصل على قدر كافٍ من الساعات
  const underScheduledCourses = evaluatedCourses
    .filter((c) => c.priorityScore >= 60 && (underScheduledMap[c.id] || 0) < 90)
    .map((c) => ({
      courseId: c.id,
      title: c.title,
      scheduledMinutes: underScheduledMap[c.id] || 0,
      priorityScore: c.priorityScore,
    }));

  return {
    plannedSessions: generatedPlannedSessions,
    preservedSessions,
    underScheduledCourses,
    totalPlannedSessions: generatedPlannedSessions.length,
  };
}
