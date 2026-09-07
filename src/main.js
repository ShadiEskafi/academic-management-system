// src/main.js
// نقطة الانطلاق الرئيسية، إدارة الجلسة، ونظام التوجيه (Router)
import './style.css';
import { onAuthStateChange, signOut } from './api/auth.js';
import { setCurrentUser } from './state/store.js';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderAppShell } from './components/AppShell.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';
import { renderCourseDetailPage } from './pages/CourseDetailPage.js';
import { renderAvailabilityPage } from './pages/AvailabilityPage.js';

const appEl = document.querySelector('#app');

let currentCleanup = null;
let mainContentEl = null;
let isRoutingActive = false;

async function handleRoute() {
  if (!mainContentEl) return;

  const hash = window.location.hash || '#/semesters';

  // تنظيف أي صفحة أو اشتراك سابق
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // مسار أوقات التفرغ الأسبوعية
  if (hash.startsWith('#/availability')) {
    currentCleanup = await renderAvailabilityPage(mainContentEl);
    return;
  }

  // مسار تفاصيل المساق وشجرة المواضيع
  if (hash.startsWith('#/course/')) {
    const parts = hash.split('/');
    const courseId = parts[2];
    const currentPositionTopicId = parts[3] || null;

    currentCleanup = await renderCourseDetailPage(mainContentEl, {
      courseId,
      currentPositionTopicId,
      onBack: () => {
        window.location.hash = '#/semesters';
      },
    });
    return;
  }

  // مسار مساقات فصل دراسي محدد
  if (hash.startsWith('#/semesters/')) {
    const semesterId = hash.replace('#/semesters/', '').split('/')[0];

    currentCleanup = await renderCoursesPage(mainContentEl, {
      semesterId,
      onBack: () => {
        window.location.hash = '#/semesters';
      },
      onSelectCourse: (courseId) => {
        window.location.hash = `#/course/${courseId}`;
      },
      onContinueCourse: (courseId, topicId) => {
        window.location.hash = `#/course/${courseId}/${topicId}`;
      },
    });
    return;
  }

  // المسار الافتراضي: قائمة الفصول الدراسية
  currentCleanup = await renderSemestersPage(mainContentEl, {
    onSelectSemester: (semester) => {
      window.location.hash = `#/semesters/${semester.id}`;
    },
  });
}

function initRouter() {
  if (!isRoutingActive) {
    window.addEventListener('hashchange', handleRoute);
    isRoutingActive = true;
  }
  handleRoute();
}

function stopRouter() {
  if (isRoutingActive) {
    window.removeEventListener('hashchange', handleRoute);
    isRoutingActive = false;
  }
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }
  mainContentEl = null;
}

// مستمع حالة المصادقة العام (Supabase Auth State)
onAuthStateChange(async (session) => {
  const user = session?.user ?? null;
  setCurrentUser(user);

  if (!user) {
    stopRouter();
    renderAuthPage(appEl);
    return;
  }

  // إنشاء هيكل التطبيق (App Shell) والاحتفاظ بالحاوية الداخلية
  mainContentEl = renderAppShell(appEl, {
    userEmail: user.email,
    onSignOut: async () => {
      await signOut();
    },
  });

  initRouter();
});