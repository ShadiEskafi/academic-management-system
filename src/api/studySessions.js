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
    .order('scheduled_start', { ascending: false });

  if (error) {
    console.error('Error fetching active study session:', error);
    return { session: null, error };
  }

  if (!data || data.length === 0) {
    return { session: null, error: null };
  }

  // البحث عن الجلسة الحية النشطة صراحة عبر is_live: true
  let activeSessionRow = null;
  let topicId = null;
  let topicTitle = 'موضوع عام';
  let courseTitle = '';
  let durationMinutes = 0;

  for (const row of data) {
    if (!row.notes) continue;
    try {
      const parsed = JSON.parse(row.notes);
      if (parsed && parsed.is_live === true) {
        activeSessionRow = row;
        topicId = parsed.topicId || null;
        topicTitle = parsed.topicTitle || topicTitle;
        courseTitle = parsed.courseTitle || '';
        durationMinutes = parsed.durationMinutes || 0;
        break;
      }
    } catch {}
  }

  if (!activeSessionRow) {
    return { session: null, error: null };
  }

  return {
    session: {
      ...activeSessionRow,
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
    is_live: true,
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
      duration_minutes: durationMinutes,
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
  actualEndTime = null,
  elapsedSeconds = null,
}) {
  const sessionOutcome = outcome || mapTopicStatusToOutcome(topicStatus);
  const endTimeIso = actualEndTime || new Date().toISOString();

  let topicTitle = 'موضوع عام';
  let courseTitle = '';
  let userId = null;
  let existingCourseId = courseId;

  try {
    const { data: current } = await supabase
      .from('study_sessions')
      .select('notes, user_id, course_id')
      .eq('id', sessionId)
      .single();

    if (current) {
      userId = current.user_id;
      if (!existingCourseId) existingCourseId = current.course_id;

      if (current.notes) {
        try {
          const parsed = JSON.parse(current.notes);
          topicTitle = parsed.topicTitle || topicTitle;
          courseTitle = parsed.courseTitle || courseTitle;
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error fetching session details:', err);
  }

  const updatedNotesPayload = JSON.stringify({
    topicId: topicId || null,
    topicTitle,
    courseTitle,
    is_live: false,
    elapsedSeconds: elapsedSeconds !== undefined && elapsedSeconds !== null ? Number(elapsedSeconds) : 0,
    userNotes: notes || '',
  });

  // الدفعة 1 (Batch 1): التحديثات الأساسية بالتوازي عبر Promise.all
  const updateSessionPromise = supabase
    .from('study_sessions')
    .update({
      status: 'completed',
      outcome: sessionOutcome,
      scheduled_end: endTimeIso,
      notes: updatedNotesPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  const insertSessionTopicPromise = (topicId && userId)
    ? supabase
        .from('session_topics')
        .insert([{ session_id: sessionId, topic_id: topicId, user_id: userId }])
    : Promise.resolve({ error: null });

  const updateTopicStatusPromise = topicId
    ? supabase
        .from('topics')
        .update({ status: topicStatus })
        .eq('id', topicId)
    : Promise.resolve({ error: null });

  try {
    const [sessionRes] = await Promise.all([
      updateSessionPromise,
      insertSessionTopicPromise,
      updateTopicStatusPromise,
    ]);

    if (sessionRes?.error) {
      return { error: sessionRes.error };
    }
  } catch (err) {
    console.error('Network error during primary session completion batch:', err);
    return { error: err };
  }

  // الدفعة 2 (Batch 2): تحديث تقدم المساق واستدعاء الـ RPC بالتوازي عبر Promise.all
  let nextTopicId = null;
  if (existingCourseId) {
    const courseProgressPromise = (async () => {
      try {
        const { data: allTopics } = await supabase
          .from('topics')
          .select('id, status')
          .eq('course_id', existingCourseId);

        if (allTopics && allTopics.length > 0) {
          const completedCount = allTopics.filter((t) => t.status === 'completed').length;
          const progressPct = Math.round((completedCount / allTopics.length) * 100);
          await supabase
            .from('courses')
            .update({ progress: progressPct, updated_at: new Date().toISOString() })
            .eq('id', existingCourseId);
        }
      } catch (cErr) {
        console.error('Failed to update course progress:', cErr);
      }
    })();

    const rpcPromise = (topicStatus === 'completed' && topicId)
      ? (async () => {
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc(
              'complete_topic_and_advance',
              { p_course_id: existingCourseId, p_topic_id: topicId }
            );
            if (!rpcError && rpcData) return rpcData;
          } catch (e) {
            console.error('RPC complete error:', e);
          }
          return null;
        })()
      : Promise.resolve(null);

    try {
      const [_, rpcRes] = await Promise.all([courseProgressPromise, rpcPromise]);
      if (rpcRes) nextTopicId = rpcRes;
    } catch (b2Err) {
      console.error('Batch 2 post-processing error:', b2Err);
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
    .in('status', ['completed', 'partially_completed']);

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
    .in('status', ['completed', 'partially_completed'])
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