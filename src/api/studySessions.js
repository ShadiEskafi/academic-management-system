// src/api/studySessions.js
// إدارة جلسات الدراسة — إنشاء جلسة فورية، ربط الموضوع، وتوثيق الإنهاء والملاحظات.

import { supabase } from './supabaseClient.js';
import { completeTopicAndAdvance, updateTopicStatus } from './topics.js';

/**
 * بدء جلسة دراسة فورية وحفظها في جدول study_sessions و session_topics
 */
export async function startStudySession({ courseId, topicId = null }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return {
      session: null,
      error: userError ?? new Error('المستخدم غير مسجل الدخول.'),
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      course_id: courseId,
      scheduled_start: new Date().toISOString(),
      status: 'planned',
      notes: null,
    })
    .select()
    .single();

  if (sessionError || !session) {
    return {
      session: null,
      error: sessionError ?? new Error('فشل إنشاء جلسة الدراسة.'),
    };
  }

  if (topicId) {
    const { error: linkError } = await supabase
      .from('session_topics')
      .insert({
        session_id: session.id,
        topic_id: topicId,
        user_id: userId,
      });

    if (linkError) {
      console.error('Failed to link topic to session:', linkError);
    }
  }

  return { session, error: null };
}

/**
 * إنهاء جلسة الدراسة، تحديث وقت الانتهاء والملاحظات وحالة الموضوع
 */
export async function completeStudySession({
  sessionId,
  courseId,
  topicId,
  topicStatus,
  notes = '',
}) {
  const sessionStatus = topicStatus === 'completed' ? 'completed' : 'partially_completed';
  const outcome = topicStatus === 'completed' ? 'completed' : 'partially_completed';

  const { error: sessionUpdateError } = await supabase
    .from('study_sessions')
    .update({
      scheduled_end: new Date().toISOString(),
      status: sessionStatus,
      outcome: outcome,
      notes: notes.trim() || null,
    })
    .eq('id', sessionId);

  if (sessionUpdateError) {
    return { nextTopicId: null, error: sessionUpdateError };
  }

  if (!topicId) {
    return { nextTopicId: null, error: null };
  }

  if (topicStatus === 'completed') {
    const { nextTopicId, error: advanceError } = await completeTopicAndAdvance(
      courseId,
      topicId
    );
    return { nextTopicId, error: advanceError };
  } else {
    const { error: statusError } = await updateTopicStatus(topicId, topicStatus);
    return { nextTopicId: null, error: statusError };
  }
}