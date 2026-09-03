// src/state/store.js
// نمط Pub-Sub مبني على EventTarget — نقطة الدخول الوحيدة للتعامل مع الـ State
// القاعدة الصارمة: الـ Components ممنوع تلمس هالـ object مباشرة، فقط عبر
// الدوال المُصدَّرة هون (setXxx).
// طريقة الاستهلاك المفضّلة: subscribe('courses:changed', (e) => render(e.detail))
// — الداتا توصل جاهزة عبر event.detail، بدون حاجة لنداء getState() جوا الـ callback.
// getState() يضل متاح لحالات القراءة الأولية (أول render قبل أي حدث).

const emitter = new EventTarget();

const state = {
  currentUser: null,
  semesters: [],
  courses: [],
  topics: [],
  sessions: [],
  weeklyPlan: null,
};

/**
 * يرجّع نسخة معزولة (Deep Copy) من جزء الـ state المطلوب — مش Reference مباشر.
 * هيك أي Component ما بيقدر يعدّل الداتا "بالخفاء" (مثلاً .push على array)
 * بدون ما يمرّ عبر setXxx ويطلق الحدث المناسب.
 *
 * ملاحظة أداء (لمراجعة لاحقة): structuredClone بيعمل Deep Copy فعلي، وده
 * تكلفته بتزيد مع حجم البيانات. بحجمنا الحالي (NFR-3: حتى 500 Topic) الأداء
 * مقبول، بس لو صار في استدعاء متكرر جدًا لـ getState('courses') بكل render،
 * لازم نراجعها (مثلاً Memoization أو تصغير حجم الجزء المُرجَع).
 */
export function getState(key) {
  return structuredClone(state[key]);
}

/**
 * يطلق الحدث ومعه نسخة معزولة من البيانات الجديدة عبر CustomEvent.detail —
 * هيك الـ Component بيستلم الداتا جاهزة بالـ callback مباشرة (event.detail)
 * بدون ما يحتاج ينادي getState() من جديد. بيخلي الـ Component أبسط (Pure)
 * وما بيحتاج يعرف أصلاً إنه في store بالخلفية.
 */
function emit(eventName, payload) {
  emitter.dispatchEvent(new CustomEvent(eventName, { detail: structuredClone(payload) }));
}

export function subscribe(eventName, callback) {
  emitter.addEventListener(eventName, callback);
  return () => emitter.removeEventListener(eventName, callback); // دالة unsubscribe جاهزة
}

// ---- دوال التعديل — الطريقة الوحيدة المسموحة لتغيير الـ state ----

export function setCurrentUser(user) {
  state.currentUser = user;
  emit('currentUser:changed', user);
}

export function setSemesters(semesters) {
  state.semesters = semesters;
  emit('semesters:changed', semesters);
}

export function setCourses(courses) {
  state.courses = courses;
  emit('courses:changed', courses);
}

export function setTopics(topics) {
  state.topics = topics;
  emit('topics:changed', topics);
}

export function setSessions(sessions) {
  state.sessions = sessions;
  emit('sessions:changed', sessions);
}

export function setWeeklyPlan(plan) {
  state.weeklyPlan = plan;
  emit('weeklyPlan:changed', plan);
}