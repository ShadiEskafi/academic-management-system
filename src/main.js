// src/main.js
// نقطة الدخول الرئيسية للتطبيق — الراوتر التصريحي وإدارة دورة حياة الجلسة

import './style.css';
import { supabase } from './api/supabaseClient.js';
import { renderDashboardPage } from './pages/DashboardPage.js';
import { renderWeeklyPlannerPage } from './pages/WeeklyPlannerPage.js';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';
import { renderCourseDetailPage } from './pages/CourseDetailPage.js';
import { renderAvailabilityPage } from './pages/AvailabilityPage.js';
import { renderAppShell } from './components/AppShell.js';
import { initGlobalSessionTracker } from './utils/sessionManager.js';
import { escapeHtml } from './utils/sanitize.js';
import { icons } from './utils/icons.js';
import {
  registerRoute,
  setNotFoundHandler,
  configureRouter,
  startRouter,
  stopRouter,
  navigate,
} from './state/router.js';

const rootEl = document.getElementById('app');

let currentUserId = null;
let contentContainer = null;

// =========================================================
// دالة مساعدة موحدة لعرض حالات الخطأ وفق الـ Design System
// =========================================================
function renderErrorState(container, err, retryPath) {
  container.innerHTML = `
    <div class="card error-state">
      <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
      <h3>تعذر تحميل الصفحة</h3>
      <p>${escapeHtml(err.message)}</p>
      ${retryPath ? '<button type="button" class="btn-secondary" id="error-retry-btn">إعادة المحاولة</button>' : ''}
    </div>
  `;

  if (retryPath) {
    container.querySelector('#error-retry-btn')?.addEventListener('click', () => {
      const targetHash = '#' + retryPath;
      if (window.location.hash === targetHash) {
        // نفس المسار — إعادة تشغيل معالج الراوتر يدوياً
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        navigate(retryPath);
      }
    });
  }
}

// =========================================================
// دالة مساعدة: تحميل مبدئي + معالجة أخطاء موحدة
// =========================================================
async function withLifecycle(container, { loadingText, retryPath, run }) {
  container.innerHTML = `
    <p style="color:var(--color-text);padding:1rem;">
      ${loadingText}
    </p>
  `;
  try {
    return await run();
  } catch (err) {
    console.error(err);
    renderErrorState(container, err, retryPath);
    return null;
  }
}

// =========================================================
// تسجيل المسارات التصريحي (Declarative Route Table)
// =========================================================

// 0. لوحة التحكم المركزية (الشاشة الافتراضية)
registerRoute('/dashboard', async ({ container }) => {
  updateActiveNav('nav-link-dashboard');
  return withLifecycle(container, {
    loadingText: 'جاري تحميل لوحة التحكم المركزية...',
    retryPath: '/dashboard',
    run: () => renderDashboardPage(container),
  });
});

// 0.5. جدول المذاكرة والتخطيط الأسبوعي
registerRoute('/planner', async ({ container }) => {
  updateActiveNav('nav-link-planner');
  return withLifecycle(container, {
    loadingText: 'جاري تحميل جدول المذاكرة والتخطيط الأسبوعي...',
    retryPath: '/planner',
    run: () => renderWeeklyPlannerPage(container),
  });
});

// 1. شاشة أوقات التفرغ
registerRoute('/availability', async ({ container }) => {
  updateActiveNav('nav-link-availability');
  return withLifecycle(container, {
    loadingText: 'جاري تحميل أوقات التفرغ...',
    retryPath: '/availability',
    run: () => renderAvailabilityPage(container),
  });
});

// 2. تفاصيل المساق — مع دعم الـ Deep Link عبر ?topicId=
registerRoute('/semesters/:semesterId/courses/:courseId', async ({ params, query, container }) => {
  updateActiveNav('nav-link-semesters');
  const { semesterId, courseId } = params;

  return withLifecycle(container, {
    loadingText: 'جاري تحميل تفاصيل المساق...',
    retryPath: `/semesters/${semesterId}/courses/${courseId}`,
    run: () =>
      renderCourseDetailPage(container, {
        courseId,
        currentPositionTopicId: query.topicId || null,
        onBack: () => navigate(`/semesters/${semesterId}/courses`),
      }),
  });
});

// 3. مساقات الفصل
registerRoute('/semesters/:semesterId/courses', async ({ params, container }) => {
  updateActiveNav('nav-link-semesters');
  const { semesterId } = params;

  // Guard دفاعي — حماية من قيمة غير سليمة لو انسربت
  if (semesterId.includes('[object')) {
    navigate('/semesters');
    return;
  }

  return withLifecycle(container, {
    loadingText: 'جاري تحميل المساقات...',
    retryPath: `/semesters/${semesterId}/courses`,
    run: () =>
      renderCoursesPage(container, {
        semesterId,
        onBack: () => navigate('/semesters'),
        onSelectCourse: (courseId) => navigate(`/semesters/${semesterId}/courses/${courseId}`),
      }),
  });
});

// 4. الفصول الدراسية
registerRoute('/semesters', async ({ container }) => {
  updateActiveNav('nav-link-semesters');

  return withLifecycle(container, {
    loadingText: 'جاري تحميل الفصول الدراسية...',
    retryPath: '/semesters',
    run: () =>
      renderSemestersPage(container, {
        onSelectSemester: (target) => {
          const semesterId =
            target && typeof target === 'object' ? target.id || target.semesterId : target;
          if (semesterId) navigate(`/semesters/${semesterId}/courses`);
        },
      }),
  });
});

// مسار احتياطي (404 داخلي) — توجيه للوحة التحكم
setNotFoundHandler(async () => {
  navigate('/dashboard');
  return null;
});

// =========================================================
// إدارة دورة حياة المصادقة (Auth Lifecycle)
// =========================================================

async function syncAuthState(session) {
  const user = session?.user ?? null;
  const newUserId = user?.id ?? null;

  if (newUserId === currentUserId && contentContainer) {
    return;
  }

  currentUserId = newUserId;
  stopRouter();

  // المستخدم غير مسجل دخول
  if (!user) {
    contentContainer = null;
    showAuth();
    return;
  }

  // المستخدم مسجل دخول -> بناء الهيكل العام
  rootEl.innerHTML = '';
  contentContainer = renderAppShell(rootEl, {
    userEmail: user.email,
    onSignOut: async () => {
      await supabase.auth.signOut();
      window.location.hash = '';
    },
  });

  configureRouter({ getContainer: () => contentContainer });
  startRouter();

  setTimeout(() => {
    initGlobalSessionTracker(user.id);
  }, 0);
}

/**
 * فحص الجلسة الأولي فور تشغيل التطبيق (Bootstrapping)
 */
async function bootstrapApp() {
  // توجيه المسار الافتراضي إذا كان فارغاً
  if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
    window.location.hash = '#/dashboard';
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) {
    await syncAuthState(null);
  } else {
    await syncAuthState(data.session);
  }
}

/**
 * الاستماع لتغيرات حالة المصادقة اللاحقة
 */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') return;
  await syncAuthState(session);
});

function updateActiveNav(activeId) {
  const links = document.querySelectorAll('.nav-header-link');
  links.forEach((link) => {
    link.classList.remove('active');
  });

  const target = document.getElementById(activeId);
  if (target) {
    target.classList.add('active');
  }
}

function showAuth() {
  rootEl.innerHTML = '';
  renderAuthPage(rootEl);
}

// إطلاق التطبيق صراحة فور تحميل الملف
bootstrapApp();