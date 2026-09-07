// src/main.js
// نقطة الدخول الرئيسية للتطبيق — توجيه الراوتر وإدارة دورة حياة الجلسة

import './style.css';
import { supabase } from './api/supabaseClient.js';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';
import { renderCourseDetailPage } from './pages/CourseDetailPage.js';
import { renderAvailabilityPage } from './pages/AvailabilityPage.js';
import { renderAppShell } from './components/AppShell.js';
import { initGlobalSessionTracker } from './utils/sessionManager.js';

const rootEl = document.getElementById('app');

let currentUserId = null;
let contentContainer = null;
let currentPageCleanup = null;
let renderRequestId = 0;

/**
 * إدارة تغييرات حالة المصادقة
 */
supabase.auth.onAuthStateChange(async (event, session) => {
  // تجديد الـ access token لا يحتاج إلى إعادة بناء الواجهة
  if (event === 'TOKEN_REFRESHED') {
    return;
  }

  const user = session?.user ?? null;
  const newUserId = user?.id ?? null;

  // لا تعيد بناء التطبيق إذا كان نفس المستخدم ما زال مسجلاً
  if (newUserId === currentUserId) {
    return;
  }

  currentUserId = newUserId;

  // المستخدم سجّل الخروج
  if (!user) {
    if (currentPageCleanup) {
      currentPageCleanup();
    }

    currentPageCleanup = null;
    contentContainer = null;

    showAuth();
    return;
  }

  // تنظيف الصفحة السابقة قبل إنشاء AppShell جديد
  if (currentPageCleanup) {
    currentPageCleanup();
  }

  currentPageCleanup = null;

  // 1. بناء الهيكل العام للتطبيق
  contentContainer = renderAppShell(rootEl, {
    userEmail: user.email,
    onSignOut: async () => {
      await supabase.auth.signOut();
      window.location.hash = '';
    },
  });

  // 2. تشغيل الراوتر فوراً لمنع الشاشة البيضاء/السوداء
  handleRoute();

  // 3. فحص الجلسات العالقة في الـ Event Loop القادم لمنع Supabase Auth Deadlock
  setTimeout(() => {
    initGlobalSessionTracker(user.id);
  }, 0);
});

/**
 * معالجة الـ hash routing
 */
async function handleRoute() {
  if (!contentContainer) return;

  const requestId = ++renderRequestId;

  // تنظيف الصفحة الحالية قبل تحميل صفحة جديدة
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  const hash = window.location.hash || '#/semesters';
  const isCurrentRequest = () => requestId === renderRequestId;

  // =========================================================
  // 1. شاشة أوقات التفرغ
  // =========================================================
  if (hash === '#/availability') {
    contentContainer.innerHTML = `
      <p style="color:var(--text);padding:1rem;">
        جاري تحميل أوقات التفرغ...
      </p>
    `;

    const cleanup = await renderAvailabilityPage(contentContainer);

    if (!isCurrentRequest()) {
      if (cleanup) cleanup();
      return;
    }

    currentPageCleanup = cleanup;
    updateActiveNav('nav-link-availability');
    return;
  }

  // =========================================================
  // 2. شاشة تفاصيل المساق
  // =========================================================
  const courseDetailMatch = hash.match(
    /^#\/semesters\/([^/]+)\/courses\/([^/]+)$/
  );

  if (courseDetailMatch) {
    const semesterId = courseDetailMatch[1];
    const courseId = courseDetailMatch[2];

    contentContainer.innerHTML = `
      <p style="color:var(--text);padding:1rem;">
        جاري تحميل تفاصيل المساق...
      </p>
    `;

    try {
      const cleanup = await renderCourseDetailPage(contentContainer, {
        courseId,
        onBack: () => {
          window.location.hash = `#/semesters/${semesterId}/courses`;
        },
      });

      if (!isCurrentRequest()) {
        if (cleanup) cleanup();
        return;
      }

      currentPageCleanup = cleanup;
    } catch (err) {
      console.error('Failed to render course detail page:', err);

      if (!isCurrentRequest()) return;

      contentContainer.innerHTML = `
        <div style="padding:1.5rem;color:#ef4444;">
          <h3>فشل تحميل تفاصيل المساق</h3>
          <p>${escapeHtml(err.message)}</p>
          <button
            type="button"
            class="btn-secondary"
            onclick="window.location.hash='#/semesters/${semesterId}/courses'"
          >
            العودة لمساقات الفصل
          </button>
        </div>
      `;
    }

    updateActiveNav('nav-link-semesters');
    return;
  }

  // =========================================================
  // 3. شاشة مساقات الفصل
  // =========================================================
  const coursesMatch = hash.match(
    /^#\/semesters\/([^/]+)(?:\/courses)?$/
  );

  if (coursesMatch && coursesMatch[1] !== 'courses') {
    const rawSemesterId = coursesMatch[1];

    if (
      rawSemesterId.includes('[object') ||
      rawSemesterId === '[object%20Object]'
    ) {
      window.location.hash = '#/semesters';
      return;
    }

    contentContainer.innerHTML = `
      <p style="color:var(--text);padding:1rem;">
        جاري تحميل المساقات...
      </p>
    `;

    const navigationCallbacks = {
      onBack: () => {
        window.location.hash = '#/semesters';
      },
      onSelectCourse: (courseId) => {
        window.location.hash = `#/semesters/${rawSemesterId}/courses/${courseId}`;
      },
    };

    try {
      const cleanup = await renderCoursesPage(contentContainer, {
        semesterId: rawSemesterId,
        ...navigationCallbacks,
      });

      if (!isCurrentRequest()) {
        if (cleanup) cleanup();
        return;
      }

      currentPageCleanup = cleanup;
    } catch (err) {
      console.error('Failed to render courses page:', err);

      if (!isCurrentRequest()) return;

      contentContainer.innerHTML = `
        <div style="padding:1.5rem;color:#ef4444;">
          <h3>فشل تحميل صفحة المساقات</h3>
          <p>${escapeHtml(err.message)}</p>
          <button
            type="button"
            class="btn-secondary"
            onclick="window.location.hash='#/semesters'"
          >
            العودة للفصول الدراسية
          </button>
        </div>
      `;
    }

    updateActiveNav('nav-link-semesters');
    return;
  }

  // =========================================================
  // 4. الشاشة الافتراضية — الفصول الدراسية
  // =========================================================
  contentContainer.innerHTML = `
    <p style="color:var(--text);padding:1rem;">
      جاري تحميل الفصول الدراسية...
    </p>
  `;

  try {
    const cleanup = await renderSemestersPage(contentContainer, {
      onSelectSemester: (target) => {
        const semesterId =
          target && typeof target === 'object'
            ? target.id || target.semesterId
            : target;

        if (semesterId) {
          window.location.hash = `#/semesters/${semesterId}/courses`;
        }
      },
    });

    if (!isCurrentRequest()) {
      if (cleanup) cleanup();
      return;
    }

    currentPageCleanup = cleanup;
  } catch (err) {
    console.error('Failed to render semesters page:', err);

    if (!isCurrentRequest()) return;

    contentContainer.innerHTML = `
      <div style="padding:1.5rem;color:#ef4444;">
        <h3>فشل تحميل الفصول الدراسية</h3>
        <p>${escapeHtml(err.message)}</p>
        <button
          type="button"
          class="btn-secondary"
          onclick="window.location.hash='#/semesters'"
        >
          إعادة المحاولة
        </button>
      </div>
    `;
  }

  updateActiveNav('nav-link-semesters');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

window.addEventListener('hashchange', handleRoute);