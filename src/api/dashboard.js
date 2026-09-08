// src/api/dashboard.js
// وحدة API المجمعة لوحة التحكم المركزية - استراتيجية الجلب المجمع O(1)
// تفحص الفصل النشط أولاً ثم تنفذ Promise.all متزامن لمنع استعلامات N+1

import { supabase } from './supabaseClient.js';
import { fetchCoursesBySemester } from './courses.js';
import { fetchAvailability, calculateSlotDurationMinutes } from './availability.js';
import { getActiveStudySession } from './studySessions.js';

/**
 * جلب جميع بيانات وإحصائيات لوحة التحكم في طلب مجمع موحد O(1)
 */
export async function fetchDashboardData() {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (authErr || !userId) {
    return {
      hasActiveSemester: false,
      currentSemester: null,
      courses: [],
      activeSession: null,
      upcomingDeadlines: [],
      weeklyStats: { hoursByDay: [0, 0, 0, 0, 0, 0, 0], totalSeconds: 0, targetWeeklyHours: 0 },
      overallStats: { totalStudyHours: 0, overallTopicsProgress: 0, activeCoursesCount: 0, pendingDeadlinesCount: 0 },
      availabilitySlots: [],
      error: authErr || new Error('المستخدم غير مسجل الدخول'),
    };
  }

  // -------------------------------------------------------------
  // الخطوة الأولى: جلب الفصل الدراسي الحالي (is_current = true) وتوفير قائمة الفصول
  // -------------------------------------------------------------
  let currentSemester = null;
  let allSemesters = [];

  const { data: userSemestersData, error: semErr } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!semErr && userSemestersData) {
    allSemesters = userSemestersData;
    // البحث أولاً عن الفصل المحدد صراحة بـ is_current = true
    currentSemester =
      allSemesters.find((s) => s.is_current === true) ||
      allSemesters.find((s) => s.status === 'active' || s.status === 'in_progress') ||
      allSemesters[0] ||
      null;
  }

  // -------------------------------------------------------------
  // الخطوة الثالثة (حالة الفراغ): في حال عدم وجود أي فصل نشط
  // -------------------------------------------------------------
  if (!currentSemester) {
    return {
      hasActiveSemester: false,
      currentSemester: null,
      allSemesters: [],
      courses: [],
      activeSession: null,
      upcomingDeadlines: [],
      weeklyStats: { hoursByDay: [0, 0, 0, 0, 0, 0, 0], totalSeconds: 0, targetWeeklyHours: 0 },
      overallStats: { totalStudyHours: 0, overallTopicsProgress: 0, activeCoursesCount: 0, pendingDeadlinesCount: 0 },
      availabilitySlots: [],
      error: null,
    };
  }

  // -------------------------------------------------------------
  // الخطوة الثانية: تنفيذ Promise.all المجمع O(1) لجلب باقي البيانات
  // -------------------------------------------------------------
  const semesterId = currentSemester.id;

  try {
    const [
      coursesResult,
      activeSessionResult,
      studySessionsResult,
      assignmentsResult,
      examsResult,
      availabilityResult,
    ] = await Promise.all([
      fetchCoursesBySemester(semesterId),
      getActiveStudySession(userId),
      supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('scheduled_start', { ascending: false }),
      supabase
        .from('assignments')
        .select('*, courses!inner(semester_id, title)')
        .eq('courses.semester_id', semesterId)
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('exams')
        .select('*, courses!inner(semester_id, title)')
        .eq('courses.semester_id', semesterId)
        .order('exam_date', { ascending: true, nullsFirst: false }),
      fetchAvailability(),
    ]);

    const courses = coursesResult.courses || [];
    const activeSession = activeSessionResult.session || null;
    const completedSessions = studySessionsResult.data || [];
    const rawAssignments = assignmentsResult.data || [];
    const rawExams = examsResult.data || [];
    const availabilitySlots = availabilityResult.slots || [];

    // معالجة جدول المواعيد والاستحقاقات القادمة
    const upcomingDeadlines = formatUpcomingDeadlines(rawAssignments, rawExams);

    // معالجة إحصائيات النشاط الأسبوعي
    const weeklyStats = calculateWeeklyActivityStats(completedSessions, availabilitySlots);

    // معالجة الإحصائيات الفائقة العامة
    const overallStats = calculateOverallStats(courses, completedSessions, upcomingDeadlines);

    return {
      hasActiveSemester: true,
      currentSemester,
      allSemesters,
      courses,
      activeSession,
      upcomingDeadlines,
      weeklyStats,
      overallStats,
      availabilitySlots,
      error: null,
    };
  } catch (err) {
    console.error('Error in fetchDashboardData Promise.all:', err);
    return {
      hasActiveSemester: true,
      currentSemester,
      courses: [],
      activeSession: null,
      upcomingDeadlines: [],
      weeklyStats: { hoursByDay: [0, 0, 0, 0, 0, 0, 0], totalSeconds: 0, targetWeeklyHours: 0 },
      overallStats: { totalStudyHours: 0, overallTopicsProgress: 0, activeCoursesCount: 0, pendingDeadlinesCount: 0 },
      availabilitySlots: [],
      error: err,
    };
  }
}

/**
 * تنسيق المواعيد والاستحقاقات القادمة (الواجبات والاختبارات)
 */
function formatUpcomingDeadlines(assignments = [], exams = []) {
  const list = [];

  // إضافة التكليفات والواجبات
  assignments.forEach((item) => {
    list.push({
      id: item.id,
      title: item.title,
      type: item.type || 'assignment',
      typeLabel: item.type === 'project' ? 'مشروع' : item.type === 'homework' ? 'واجب بيتي' : 'تأدية تكليف',
      date: item.due_date,
      courseTitle: item.courses?.title || 'مساق غير مسمى',
      priority: item.priority || 'medium',
      isExam: false,
    });
  });

  // إضافة الامتحانات والاختبارات
  exams.forEach((item) => {
    list.push({
      id: item.id,
      title: item.title,
      type: 'exam',
      typeLabel: item.exam_type === 'final' ? 'امتحان نهائي' : item.exam_type === 'quiz' ? 'كويز قصير' : 'امتحان نصفي',
      date: item.exam_date,
      courseTitle: item.courses?.title || 'مساق غير مسمى',
      priority: 'high',
      isExam: true,
    });
  });

  // ترتيب المواعيد تصاعدياً (الأقرب أولاً)
  return list.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });
}

/**
 * حساب ساعات وتوزيع النشاط الأسبوعي (من الأحد إلى السبت)
 */
function calculateWeeklyActivityStats(completedSessions = [], availabilitySlots = []) {
  const hoursByDay = [0, 0, 0, 0, 0, 0, 0]; // الأحد = 0، الإثنين = 1 ... السبت = 6
  let totalSeconds = 0;

  // تحديد بداية ونهاية الأسبوع الحالي (من يوم الأحد الماضي)
  const now = new Date();
  const dayOfWeekIndex = now.getDay(); // 0 = Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeekIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  completedSessions.forEach((s) => {
    const sessionDate = new Date(s.scheduled_start || s.created_at);
    if (sessionDate >= startOfWeek && sessionDate < endOfWeek) {
      const dayIdx = sessionDate.getDay();
      const startMs = sessionDate.getTime();
      const endMs = s.scheduled_end
        ? new Date(s.scheduled_end).getTime()
        : s.updated_at
        ? new Date(s.updated_at).getTime()
        : startMs;

      const durationSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
      totalSeconds += durationSec;
      hoursByDay[dayIdx] += durationSec / 3600;
    }
  });

  // حساب إجمالي ساعات التوفر المستهدفة الأسبوعية
  let targetWeeklyMinutes = 0;
  availabilitySlots.forEach((slot) => {
    targetWeeklyMinutes += calculateSlotDurationMinutes(slot.start_time, slot.end_time);
  });

  return {
    hoursByDay: hoursByDay.map((h) => Number(h.toFixed(1))),
    totalSeconds,
    totalHours: (totalSeconds / 3600).toFixed(1),
    targetWeeklyHours: (targetWeeklyMinutes / 60).toFixed(1),
  };
}

/**
 * حساب الإحصائيات الفائقة العامة
 */
function calculateOverallStats(courses = [], completedSessions = [], upcomingDeadlines = []) {
  let totalStudySeconds = 0;
  completedSessions.forEach((s) => {
    const startMs = new Date(s.scheduled_start || s.created_at).getTime();
    const endMs = s.scheduled_end
      ? new Date(s.scheduled_end).getTime()
      : s.updated_at
      ? new Date(s.updated_at).getTime()
      : startMs;
    totalStudySeconds += Math.max(0, Math.floor((endMs - startMs) / 1000));
  });

  let totalTopicsCount = 0;
  let completedTopicsCount = 0;

  courses.forEach((c) => {
    totalTopicsCount += c.totalTopics || 0;
    completedTopicsCount += c.completedTopics || 0;
  });

  const overallTopicsProgress =
    totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;

  return {
    totalStudyHours: (totalStudySeconds / 3600).toFixed(1),
    overallTopicsProgress,
    activeCoursesCount: courses.length,
    pendingDeadlinesCount: upcomingDeadlines.length,
  };
}
