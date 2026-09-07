// src/utils/sessionManager.js
import {
  getActiveStudySession,
  startStudySession,
  completeStudySession,
  cancelStudySession,
} from '../api/studySessions.js';
import {
  renderActiveSessionBar,
  renderQuickUpdateModal,
  renderStaleSessionModal,
} from '../components/ActiveSessionModal.js';
import { showToast } from './toast.js';

let currentSession = null;
let removeBarFn = null;
const listeners = new Set();

function notifyListeners(eventPayload) {
  listeners.forEach((listener) => {
    try {
      listener(eventPayload);
    } catch (err) {
      console.error('Session listener error:', err);
    }
  });
}

function mountBar(session) {
  if (removeBarFn) {
    removeBarFn();
    removeBarFn = null;
  }

  currentSession = session;
  const startTime = session.scheduled_start
    ? new Date(session.scheduled_start).getTime()
    : Date.now();

  const endTime = session.scheduled_end
    ? new Date(session.scheduled_end).getTime()
    : null;

  const displayTitle = session.course_title
    ? `${session.topic_title} — (${session.course_title})`
    : session.topic_title;

  removeBarFn = renderActiveSessionBar({
    topicTitle: displayTitle,
    startTime,
    endTime,
    onFinish: ({ formattedTime, isTimeUp }) => {
      if (removeBarFn) {
        removeBarFn();
        removeBarFn = null;
      }

      if (isTimeUp) {
        showToast('انتهى الوقت المحدد للمذاكرة! وثّق إنجازك الآن', 'warning', 5000);
      }

      renderQuickUpdateModal({
        topicTitle: session.topic_title,
        formattedDuration: formattedTime,
        isTimeUp,
        onSave: async ({ topicStatus, notes }) => {
          const { nextTopicId, error } = await completeStudySession({
            sessionId: session.id,
            courseId: session.course_id,
            topicId: session.topic_id,
            topicStatus,
            notes,
          });

          if (error) {
            showToast('حدث خطأ أثناء حفظ الجلسة', 'error');
            mountBar(session);
            return { error };
          }

          const finishedSession = { ...currentSession };
          currentSession = null;
          showToast('تم إنهاء جلسة المذاكرة بنجاح', 'success');

          notifyListeners({
            event: 'completed',
            session: finishedSession,
            nextTopicId,
          });

          return { error: null };
        },
        onClose: () => {
          if (currentSession && !removeBarFn) {
            mountBar(currentSession);
          }
        },
      });
    },
    onCancel: async () => {
      if (removeBarFn) {
        removeBarFn();
        removeBarFn = null;
      }

      const sessionToCancel = { ...currentSession };
      currentSession = null;

      const { error } = await cancelStudySession(sessionToCancel.id);
      if (error) {
        showToast('تعذر إلغاء الجلسة من الخادم', 'error');
      } else {
        showToast('تم إلغاء جلسة المذاكرة', 'info');
      }

      notifyListeners({
        event: 'cancelled',
        session: sessionToCancel,
      });
    },
  });
}

/**
 * معالجة الجلسة العالقة بطريقة تفاعلية شفافة
 */
function handleStaleSession(session) {
  renderStaleSessionModal({
    session,
    onResolve: () => {
      // توثيق كمنجزة بالمدة المستهدفة المحددة مسبقاً
      const durationMinutes = session.duration_minutes || 45;
      renderQuickUpdateModal({
        topicTitle: session.topic_title,
        formattedDuration: `${durationMinutes} دقيقة`,
        isTimeUp: true,
        onSave: async ({ topicStatus, notes }) => {
          const { nextTopicId, error } = await completeStudySession({
            sessionId: session.id,
            courseId: session.course_id,
            topicId: session.topic_id,
            topicStatus,
            notes,
          });

          if (error) {
            showToast('فشل حفظ الجلسة', 'error');
            return { error };
          }

          currentSession = null;
          showToast('تم حفظ إنجاز الجلسة السابقة بنجاح', 'success');
          notifyListeners({ event: 'completed', session, nextTopicId });
          return { error: null };
        },
      });
    },
    onDiscard: async () => {
      const { error } = await cancelStudySession(session.id);
      if (error) {
        showToast('تعذر حذف الجلسة', 'error');
      } else {
        currentSession = null;
        showToast('تم إلغاء الجلسة العالقة', 'info');
        notifyListeners({ event: 'cancelled', session });
      }
    },
  });
}

/**
 * تهيئة التتبع العام عند إقلاع التطبيق
 */
export async function initGlobalSessionTracker(userId = null) {
  const { session, error } = await getActiveStudySession(userId);
  if (error) {
    console.error('Failed to restore session on init:', error);
    return;
  }
  if (!session) return;

  const now = Date.now();
  let isStale = false;

  if (session.scheduled_end) {
    // جلسة محددة بوقت وتجاوزت نهايتها
    isStale = now > new Date(session.scheduled_end).getTime();
  } else {
    // جلسة مفتوحة مر عليها أكثر من 3 ساعات
    const startMs = new Date(session.scheduled_start).getTime();
    isStale = now - startMs > 3 * 60 * 60 * 1000;
  }

  if (isStale) {
    handleStaleSession(session);
  } else {
    mountBar(session);
    notifyListeners({ event: 'restored', session });
  }
}

/**
 * بدء جلسة جديدة مع خاصية التعافي الذاتي (Self-Healing)
 */
export async function startNewGlobalSession({ courseId, courseTitle, topicId, topicTitle, durationMinutes }) {
  const { session, error } = await startStudySession({
    courseId,
    courseTitle,
    topicId,
    topicTitle,
    durationMinutes,
  });

  if (error) {
    // تعافي ذاتي: في حال وجود جلسة سابقة في قاعدة البيانات
    const { session: activeExisting } = await getActiveStudySession();
    if (activeExisting) {
      initGlobalSessionTracker(); // تفعيل الشريط أو مودال الاستعادة فوراً لحل الانسداد
    }
    return { session: null, error };
  }

  mountBar(session);
  notifyListeners({ event: 'started', session });

  return { session, error: null };
}

export function isSessionActive() {
  return currentSession !== null;
}

export function getActiveSession() {
  return currentSession;
}

export function subscribeToSession(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}