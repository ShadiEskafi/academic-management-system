// src/api/studySessions.js
import { supabase } from './supabaseClient.js';

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
  } catch {}

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

export async function completeStudySession({
  sessionId,
  courseId,
  topicId,
  topicStatus,
  outcome = null,
  notes,
}) {
  const sessionOutcome = outcome || mapTopicStatusToOutcome(topicStatus);

  const { error: sessionError } = await supabase
    .from('study_sessions')
    .update({
      status: 'completed',
      outcome: sessionOutcome,
      scheduled_end: new Date().toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError) return { error: sessionError };

  if (topicId) {
    const { error: topicError } = await supabase
      .from('topics')
      .update({ status: topicStatus })
      .eq('id', topicId);

    if (topicError) {
      console.error('Failed to update topic status:', topicError);
    }
  }

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

export async function cancelStudySession(sessionId) {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId);

  return { error };
}

/**
 * حساب إحصائيات المذاكرة التراكمية للمساق من الجلسات المكتملة
 */
export async function fetchCourseStudyStats(courseId) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('scheduled_start, scheduled_end, updated_at, created_at, outcome')
    .eq('course_id', courseId)
    .eq('status', 'completed');

  if (error) {
    console.error('Failed to fetch course study stats:', error);
    return { totalSeconds: 0, totalMinutes: 0, completedSessionsCount: 0, error };
  }

  let totalSeconds = 0;

  (data || []).forEach((session) => {
    const startMs = new Date(session.scheduled_start || session.created_at).getTime();
    
    // Fallback: إذا كانت الجلسة قديمة بدون scheduled_end نعتمد على updated_at
    const endMs = session.scheduled_end
      ? new Date(session.scheduled_end).getTime()
      : session.updated_at
      ? new Date(session.updated_at).getTime()
      : startMs;

    const diff = Math.max(0, Math.floor((endMs - startMs) / 1000));
    totalSeconds += diff;
  });

  return {
    totalSeconds,
    totalMinutes: Math.floor(totalSeconds / 60),
    completedSessionsCount: data?.length || 0,
    error: null,
  };
}