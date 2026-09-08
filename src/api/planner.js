// src/api/planner.js
// خدمات البيانات والـ API المجمعة لخطة المذاكرة الأسبوعية (Phase 4 Planner API)

import { supabase } from './supabaseClient.js';
import { fetchCoursesBySemester } from './courses.js';
import { fetchAvailability } from './availability.js';
import { getLocalWeekStartDate } from '../utils/studyPlanner.js';

/**
 * جلب جميع مدخلات خوارزمية التخطيط الأسبوعي بطلب شبكة مجمع O(1)
 */
export async function fetchPlannerData(weekStartDateInput = new Date()) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (authErr || !userId) {
    return {
      userId: null,
      currentSemester: null,
      courses: [],
      availabilitySlots: [],
      exams: [],
      assignments: [],
      existingSessions: [],
      existingPlan: null,
      error: authErr || new Error('المستخدم غير مسجل الدخول'),
    };
  }

  const baseWeekStart = getLocalWeekStartDate(weekStartDateInput);
  const weekStartIso = baseWeekStart.toISOString().split('T')[0];

  const weekEndObj = new Date(baseWeekStart);
  weekEndObj.setDate(weekEndObj.getDate() + 7);
  const weekEndIso = weekEndObj.toISOString();

  try {
    // 1. جلب الفصل النشط حالياً
    const { data: currentSemester } = await supabase
      .from('semesters')
      .select('*')
      .eq('user_id', userId)
      .eq('is_current', true)
      .maybeSingle();

    if (!currentSemester) {
      return {
        userId,
        currentSemester: null,
        courses: [],
        availabilitySlots: [],
        exams: [],
        assignments: [],
        existingSessions: [],
        existingPlan: null,
        error: null,
      };
    }

    const semesterId = currentSemester.id;

    // 2. إطلاق Promise.all متزامن لجلب كافة البيانات
    const [
      coursesResult,
      availabilityResult,
      assignmentsResult,
      examsResult,
      weeklyPlanResult,
      sessionsResult,
    ] = await Promise.all([
      fetchCoursesBySemester(semesterId),
      fetchAvailability(),
      supabase
        .from('assignments')
        .select('*, courses!inner(semester_id, title)')
        .eq('courses.semester_id', semesterId)
        .neq('status', 'completed'),
      supabase
        .from('exams')
        .select('*, courses!inner(semester_id, title)')
        .eq('courses.semester_id', semesterId),
      supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartIso)
        .maybeSingle(),
      supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_start', baseWeekStart.toISOString())
        .lt('scheduled_start', weekEndIso)
        .order('scheduled_start', { ascending: true }),
    ]);

    const courses = coursesResult.courses || [];
    const availabilitySlots = availabilityResult.slots || [];
    const assignments = assignmentsResult.data || [];
    const exams = examsResult.data || [];
    const existingPlan = weeklyPlanResult.data || null;
    const existingSessions = sessionsResult.data || [];

    return {
      userId,
      currentSemester,
      courses,
      availabilitySlots,
      exams,
      assignments,
      existingSessions,
      existingPlan,
      weekStartIso,
      error: null,
    };
  } catch (err) {
    console.error('Error fetching planner data:', err);
    return {
      userId,
      currentSemester: null,
      courses: [],
      availabilitySlots: [],
      exams: [],
      assignments: [],
      existingSessions: [],
      existingPlan: null,
      error: err,
    };
  }
}

/**
 * حفظ أو تحديث الخطة الأسبوعية والجلسات المخططة بسلامة ناتجة (Idempotence)
 */
export async function saveWeeklyPlan({ weekStartDateInput = new Date(), planningMode = 'automatic', sessions = [] }) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (authErr || !userId) {
    return { plan: null, error: authErr || new Error('المستخدم غير مسجل الدخول') };
  }

  const baseWeekStart = getLocalWeekStartDate(weekStartDateInput);
  const weekStartIso = baseWeekStart.toISOString().split('T')[0];

  // 1. إنشاء أو استرجاع الخطة الأسبوعية في جدول weekly_plans
  let planId = null;
  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartIso)
    .maybeSingle();

  if (existingPlan) {
    planId = existingPlan.id;
    await supabase
      .from('weekly_plans')
      .update({ planning_mode: planningMode })
      .eq('id', planId);
  } else {
    const { data: newPlan, error: planErr } = await supabase
      .from('weekly_plans')
      .insert({
        user_id: userId,
        week_start_date: weekStartIso,
        planning_mode: planningMode,
      })
      .select('id')
      .single();

    if (planErr) return { plan: null, error: planErr };
    planId = newPlan.id;
  }

  // 2. سلامة إعادة التوليد (Idempotency): مسح الجلسات المخططة فقط (status = 'planned') دون مسح الجلسات المكتملة
  const weekEndObj = new Date(baseWeekStart);
  weekEndObj.setDate(weekEndObj.getDate() + 7);

  const { error: deleteErr } = await supabase
    .from('study_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'planned')
    .gte('scheduled_start', baseWeekStart.toISOString())
    .lt('scheduled_start', weekEndObj.toISOString());

  if (deleteErr) {
    console.error('Error clearing old planned sessions:', deleteErr);
  }

  // 3. إدراج الجلسات المخططة الجديدة
  if (sessions.length === 0) {
    return { planId, savedCount: 0, error: null };
  }

  const sessionPayloads = sessions.map((s) => {
    const sessionMetadata = JSON.stringify({
      topicId: s.topic_id || null,
      topicTitle: s.topicTitle || 'مذاكرة عامة',
      courseTitle: s.courseTitle || '',
      durationMinutes: s.durationMinutes || 45,
      reasonBadgeText: s.reasonBadgeText || '',
      userNotes: '',
    });

    return {
      user_id: userId,
      course_id: s.course_id,
      weekly_plan_id: planId,
      scheduled_start: s.scheduled_start,
      scheduled_end: s.scheduled_end,
      status: 'planned',
      notes: sessionMetadata,
    };
  });

  const { data: insertedSessions, error: insertErr } = await supabase
    .from('study_sessions')
    .insert(sessionPayloads)
    .select();

  if (insertErr) return { planId, savedCount: 0, error: insertErr };

  // 4. ربط الجلسات في جدول session_topics
  const topicLinks = [];
  (insertedSessions || []).forEach((inserted, idx) => {
    const original = sessions[idx];
    if (original && original.topic_id) {
      topicLinks.push({
        session_id: inserted.id,
        topic_id: original.topic_id,
        user_id: userId,
      });
    }
  });

  if (topicLinks.length > 0) {
    await supabase.from('session_topics').insert(topicLinks);
  }

  return { planId, savedCount: insertedSessions?.length || 0, error: null };
}

/**
 * إضافة جلسة مذاكرة يدوية محددة بوقت ومادة
 */
export async function createManualPlannerSession({ courseId, topicId, scheduledStart, scheduledEnd, notes = '' }) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  if (authErr || !userId) {
    return { session: null, error: authErr || new Error('المستخدم غير مسجل الدخول') };
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      course_id: courseId,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      status: 'planned',
      notes: notes ? JSON.stringify({ userNotes: notes }) : null,
    })
    .select()
    .single();

  if (!error && topicId && data) {
    await supabase.from('session_topics').insert({
      session_id: data.id,
      topic_id: topicId,
      user_id: userId,
    });
  }

  return { session: data || null, error };
}

/**
 * حذف جلسة مخططة
 */
export async function deletePlannerSession(sessionId) {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId);

  return { error };
}
