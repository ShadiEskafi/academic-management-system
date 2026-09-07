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
    userNotes: '',
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

  // جلب البيانات السابقة للحفاظ على metadata الموضوع والمساق داخل الـ JSON
  let topicTitle = 'موضوع عام';
  let courseTitle = '';
  const { data: current } = await supabase
    .from('study_sessions')
    .select('notes')
    .eq('id', sessionId)
    .single();

  if (current?.notes) {
    try {
      const parsed = JSON.parse(current.notes);
      topicTitle = parsed.topicTitle || topicTitle;
      courseTitle = parsed.courseTitle || courseTitle;
    } catch {}
  }

  const updatedNotesPayload = JSON.stringify({
    topicId: topicId || null,
    topicTitle,
    courseTitle,
    userNotes: notes || '',
  });

  const { error: sessionError } = await supabase
    .from('study_sessions')
    .update({
      status: 'completed',
      outcome: sessionOutcome,
      scheduled_end: new Date().toISOString(),
      notes: updatedNotesPayload,
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

export async function fetchCourseSessionsHistory(courseId) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('course_id', courseId)
    .eq('status', 'completed')
    .order('scheduled_start', { ascending: false });

  if (error) {
    console.error('Failed to fetch sessions history:', error);
    return { sessions: [], error };
  }

  const normalized = (data || []).map((s) => {
    const startMs = new Date(s.scheduled_start || s.created_at).getTime();
    const endMs = s.scheduled_end
      ? new Date(s.scheduled_end).getTime()
      : s.updated_at
      ? new Date(s.updated_at).getTime()
      : startMs;

    const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

    let topicId = null;
    let topicTitle = 'موضوع عام';
    let userNotes = '';

    if (s.notes) {
      try {
        const parsed = JSON.parse(s.notes);
        topicId = parsed.topicId || null;
        topicTitle = parsed.topicTitle || topicTitle;
        userNotes = parsed.userNotes !== undefined ? parsed.userNotes : '';
      } catch {
        // دعم الجلسات القديمة التي سُجلت كنص ملاحظات مباشر
        userNotes = s.notes;
      }
    }

    return {
      id: s.id,
      topicId,
      topicTitle,
      outcome: s.outcome || 'completed',
      notes: userNotes,
      durationSeconds,
      scheduledStart: s.scheduled_start || s.created_at,
      scheduledEnd: s.scheduled_end || s.updated_at,
      raw: s,
    };
  });

  return { sessions: normalized, error: null };
}

export async function updateStudySession(
  sessionId,
  { topicId, topicTitle, notes, outcome, durationSeconds }
) {
  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (outcome !== undefined) payload.outcome = outcome;

  if (durationSeconds !== undefined && Number(durationSeconds) >= 0) {
    const { data: current } = await supabase
      .from('study_sessions')
      .select('scheduled_start, created_at, notes')
      .eq('id', sessionId)
      .single();

    if (current) {
      const startMs = new Date(current.scheduled_start || current.created_at).getTime();
      payload.scheduled_end = new Date(startMs + Number(durationSeconds) * 1000).toISOString();

      let oldData = {};
      try {
        oldData = JSON.parse(current.notes || '{}');
      } catch {}

      payload.notes = JSON.stringify({
        ...oldData,
        topicId: topicId !== undefined ? topicId : oldData.topicId,
        topicTitle: topicTitle !== undefined ? topicTitle : oldData.topicTitle,
        userNotes: notes !== undefined ? notes : oldData.userNotes || '',
      });
    }
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select()
    .single();

  return { session: data, error };
}

export async function deleteStudySession(sessionId) {
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('id', sessionId);

  return { error };
}