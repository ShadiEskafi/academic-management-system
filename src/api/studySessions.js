// src/api/studySessions.js
import { supabase } from './supabaseClient.js';

/**
 * دالة مساعدة لترجمة حالة الموضوع إلى Outcome صالح ومقبول في قاعدة البيانات
 */
function mapTopicStatusToOutcome(topicStatus) {
  switch (topicStatus) {
    case 'completed':
      return 'completed';
    case 'in_progress':
    case 'needs_review':
      return 'partially_completed';
    default:
      return 'partially_completed';
  }
}

/**
 * استرجاع الجلسة النشطة للمستخدم مع منع Race Conditions
 */
export async function getActiveStudySession(explicitUserId = null) {
  let userId = explicitUserId;

  if (!userId) {
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData?.session?.user?.id;
  }

  if (!userId) {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return { session: null, error: authErr };
    }
    userId = authData.user.id;
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'planned')
    .order('scheduled_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active study session:', error);
    return { session: null, error };
  }

  if (!data) {
    return { session: null, error: null };
  }

  let topicId = null;
  let topicTitle = 'موضوع عام';
  let courseTitle = '';
  let durationMinutes = 0;

  try {
    if (data.notes) {
      const parsed = JSON.parse(data.notes);
      topicId = parsed.topicId || null;
      topicTitle = parsed.topicTitle || topicTitle;
      courseTitle = parsed.courseTitle || '';
      durationMinutes = parsed.durationMinutes || 0;
    }
  } catch {
    // في حال كانت الملاحظات نصاً عادياً قديماً
  }

  return {
    session: {
      ...data,
      topic_id: topicId,
      topic_title: topicTitle,
      course_title: courseTitle,
      duration_minutes: durationMinutes,
    },
    error: null,
  };
}

/**
 * بدء جلسة جديدة
 */
export async function startStudySession({
  courseId,
  courseTitle,
  topicId,
  topicTitle,
  durationMinutes = 0,
}) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return { session: null, error: authErr || new Error('المستخدم غير مسجل دخول') };
  }

  const { session: activeExisting } = await getActiveStudySession(authData.user.id);
  if (activeExisting) {
    return {
      session: null,
      error: new Error('لديك بالفعل جلسة مذاكرة نشطة حالياً.'),
    };
  }

  const now = new Date();
  const scheduledStart = now.toISOString();
  const scheduledEnd =
    durationMinutes > 0
      ? new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString()
      : null;

  const sessionMetadata = JSON.stringify({
    topicId,
    topicTitle: topicTitle || 'موضوع عام',
    courseTitle: courseTitle || '',
    durationMinutes,
  });

  const { data, error } = await supabase
    .from('study_sessions')
    .insert([
      {
        user_id: authData.user.id,
        course_id: courseId,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        status: 'planned',
        notes: sessionMetadata,
      },
    ])
    .select()
    .single();

  if (error) return { session: null, error };

  return {
    session: {
      ...data,
      topic_id: topicId,
      topic_title: topicTitle,
      course_title: courseTitle,
    },
    error: null,
  };
}

/**
 * إنهاء الجلسة وحفظ النتيجة وفق القيود المعتمدة في chk_session_outcome
 */
export async function completeStudySession({
  sessionId,
  courseId,
  topicId,
  topicStatus,
  outcome = null,
  notes,
}) {
  // استخدام الـ outcome الصريح إن وُجد، أو تحويل topicStatus إلى قيمة مقبولة بقيد الجدول
  const sessionOutcome = outcome || mapTopicStatusToOutcome(topicStatus);

  // 1. تحديث جدول study_sessions
  const { error: sessionError } = await supabase
    .from('study_sessions')
    .update({
      status: 'completed',
      outcome: sessionOutcome, // دائماً واحدة من: 'completed' أو 'partially_completed' أو 'studied_something_else'
      scheduled_end: new Date().toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) return { error: sessionError };

  // 2. تحديث جدول topics بحالة الموضوع الأصلية (مثل needs_review أو completed)
  if (topicId) {
    const { error: topicError } = await supabase
      .from('topics')
      .update({ status: topicStatus })
      .eq('id', topicId);

    if (topicError) {
      console.error('Failed to update topic status:', topicError);
    }
  }

  // 3. التقدم التلقائي للموضوع التالي عند اكتمال الموضوع
  let nextTopicId = null;
  if (topicStatus === 'completed' && topicId && courseId) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'complete_topic_and_advance',
        {
          p_course_id: courseId,
          p_topic_id: topicId,
        }
      );
      if (!rpcError && rpcData) nextTopicId = rpcData;
    } catch (e) {
      console.error('RPC complete error:', e);
    }
  }

  return { nextTopicId, error: null };
}

/**
 * إلغاء الجلسة وحذفها من قاعدة البيانات
 */
export async function cancelStudySession(sessionId) {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId);

  return { error };
}