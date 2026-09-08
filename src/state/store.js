// src/state/store.js
// نمط Pub-Sub مبني على EventTarget — نقطة الدخول الوحيدة للتعامل مع الـ State
// القاعدة الصارمة: الـ Components ممنوع تلمس هالـ object مباشرة، فقط عبر
// الدوال المُصدَّرة هون (setXxx).
// طريقة الاستهلاك المفضّلة: subscribe('courses:changed', (e) => render(e.detail))
// — الداتا توصل جاهزة عبر event.detail، بدون حاجة لنداء getState() جوا الـ callback.
// getState() يضل متاح لحالات القراءة الأولية (أول render قبل أي حدث).

const emitter = new EventTarget();

const state = {
  semesters: [],
  courses: [],
};

/**
 * يرجّع جزء الـ state المطلوب بشكل مباشر — بدون structuredClone.
 */
export function getState(key) {
  return state[key];
}

/**
 * يطلق الحدث ومعه البيانات الجديدة عبر CustomEvent.detail
 */
function emit(eventName, payload) {
  emitter.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}

export function subscribe(eventName, callback) {
  emitter.addEventListener(eventName, callback);
  return () => emitter.removeEventListener(eventName, callback);
}

// ---- دوال التعديل — الطريقة الوحيدة المسموحة لتغيير الـ state ----

export function setSemesters(semesters) {
  state.semesters = semesters;
  emit('semesters:changed', semesters);
}

export function setCourses(courses) {
  state.courses = courses;
  emit('courses:changed', courses);
}