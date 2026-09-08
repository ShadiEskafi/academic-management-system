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

const ACTIVE_STUDY_SESSION_KEY = 'academic_active_session_v1';

let currentSession = null;
let removeBarFn = null;
const listeners = new Set();

function getStoredActiveSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_STUDY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || !parsed.scheduled_start) return null;

    // حارس الجلسات المهجورة (Abandoned Session Guard): أكثر من 4 ساعات
    const startMs = new Date(parsed.scheduled_start).getTime();
    if (Date.now() - startMs > 4 * 60 * 60 * 1000) {
      clearStoredActiveSession();
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading active session from localStorage:', err);
    clearStoredActiveSession();
    return null;
  }
}

function saveStoredActiveSession(session) {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_STUDY_SESSION_KEY, JSON.stringify(session));
    }
  } catch (err) {
    console.error('Error saving active session to localStorage:', err);
  }
}

function clearStoredActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_STUDY_SESSION_KEY);
  } catch (err) {
    console.error('Error removing active session from localStorage:', err);
  }
}

function notifyListeners(eventPayload) {
  listeners.forEach((listener) => {
    try {
      listener(eventPayload);
    } catch (err) {
      console.error('Session listener error:', err);
    }
  });

  // إطلاق الحدث العام المخصص لاستماع لوحة التحكم والصفحات التفاعلية
  try {
    window.dispatchEvent(new CustomEvent('study-session-updated', { detail: eventPayload }));
  } catch (err) {
    console.error('Error dispatching study-session-updated event:', err);
  }
}

function mountBar(session) {
  if (removeBarFn) {
    removeBarFn();
    removeBarFn = null;
  }

  currentSession = session;
  saveStoredActiveSession(session);

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
    onFinish: ({ formattedTime, actualEndTime, elapsedSeconds, isTimeUp }) => {
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
        actualEndTime,
        elapsedSeconds,
        isTimeUp,
        onSave: async ({ topicStatus, notes, actualEndTime: savedEndTime, elapsedSeconds: savedElapsed }) => {
          // تفريغ الحفظ المحلي فوراً لتجنب التعليق
          clearStoredActiveSession();

          const { nextTopicId, error } = await completeStudySession({
            sessionId: session.id,
            courseId: session.course_id,
            topicId: session.topic_id,
            topicStatus,
            notes,
            actualEndTime: savedEndTime || actualEndTime,
            elapsedSeconds: savedElapsed !== undefined ? savedElapsed : elapsedSeconds,
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
      clearStoredActiveSession();

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
          clearStoredActiveSession();
          showToast('تم حفظ إنجاز الجلسة السابقة بنجاح', 'success');
          notifyListeners({ event: 'completed', session, nextTopicId });
          return { error: null };
        },
      });
    },
    onDiscard: async () => {
      const { error } = await cancelStudySession(session.id);
      currentSession = null;
      clearStoredActiveSession();
      if (error) {
        showToast('تعذر حذف الجلسة', 'error');
      } else {
        showToast('تم إلغاء الجلسة العالقة', 'info');
        notifyListeners({ event: 'cancelled', session });
      }
    },
  });
}

/**
 * تهيئة التتبع العام عند إقلاع التطبيق (استعادة فورية من localStorage ثم التأكيد مع Supabase)
 */
export async function initGlobalSessionTracker(userId = null) {
  // 1. استعادة سريعة لحظية من التخزين المحلي لمنع الوميض عند F5
  const localSession = getStoredActiveSession();
  if (localSession && !currentSession) {
    mountBar(localSession);
    notifyListeners({ event: 'restored', session: localSession });
  }

  // 2. التحقق من المصدر المؤكد في Supabase
  const { session, error } = await getActiveStudySession(userId);
  if (error) {
    console.error('Failed to sync active session from DB:', error);
    return;
  }

  if (!session) {
    // لا توجد جلسة نشطة حية في الداتابيز
    if (currentSession) {
      if (removeBarFn) {
        removeBarFn();
        removeBarFn = null;
      }
      currentSession = null;
      clearStoredActiveSession();
      notifyListeners({ event: 'cancelled', session: null });
    }
    return;
  }

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
    if (removeBarFn) {
      removeBarFn();
      removeBarFn = null;
    }
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
  return currentSession || getStoredActiveSession();
}

export function subscribeToSession(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}