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

const rootEl = document.getElementById('app');

let currentUserId = null;
let contentContainer = null;
let currentPageCleanup = null;
let renderRequestId = 0;

supabase.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user ?? null;
  const newUserId = user?.id ?? null;

  if (newUserId !== currentUserId) {
    currentUserId = newUserId;

    if (!user) {
      if (currentPageCleanup) currentPageCleanup();
      currentPageCleanup = null;
      contentContainer = null;
      showAuth();
      return;
    }

    if (currentPageCleanup) currentPageCleanup();
    currentPageCleanup = null;

    contentContainer = renderAppShell(rootEl, {
      userEmail: user.email,
      onSignOut: async () => {
        await supabase.auth.signOut();
        window.location.hash = '';
      },
    });

    handleRoute();
  }
});

async function handleRoute() {
  if (!contentContainer) return;

  const requestId = ++renderRequestId;
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  const hash = window.location.hash || '#/semesters';

  // 1. شاشة أوقات التفرغ (UC-12)
  if (hash === '#/availability') {
    contentContainer.innerHTML = '<p style="color:var(--text);padding:1rem;">جاري تحميل أوقات التفرغ...</p>';
    currentPageCleanup = await renderAvailabilityPage(contentContainer);
    updateActiveNav('nav-link-availability');
    return;
  }

  // 2. شاشة تفاصيل المساق
  const courseDetailMatch = hash.match(/^#\/semesters\/([^/]+)\/courses\/([^/]+)$/);
  if (courseDetailMatch) {
    const semesterId = courseDetailMatch[1];
    const courseId = courseDetailMatch[2];

    contentContainer.innerHTML = '<p style="color:var(--text);padding:1rem;">جاري تحميل تفاصيل المساق...</p>';

    try {
      currentPageCleanup = await renderCourseDetailPage(contentContainer, {
        courseId,
        onBack: () => {
          window.location.hash = `#/semesters/${semesterId}/courses`;
        },
      });
    } catch (err) {
      console.error('Failed to render course detail page:', err);
      contentContainer.innerHTML = `
        <div style="padding:1.5rem;color:#ef4444;">
          <h3>فشل تحميل تفاصيل المساق</h3>
          <p>${escapeHtml(err.message)}</p>
          <button type="button" class="btn-secondary" onclick="window.location.hash='#/semesters/${semesterId}/courses'">
            العودة لمساقات الفصل
          </button>
        </div>
      `;
    }
    updateActiveNav('nav-link-semesters');
    return;
  }

  // 3. شاشة مساقات الفصل (دعم المسارين مع حماية المعاملات ومعالجة الأخطاء)
  const coursesMatch = hash.match(/^#\/semesters\/([^/]+)(?:\/courses)?$/);
  if (coursesMatch && coursesMatch[1] !== 'courses') {
    const rawSemesterId = coursesMatch[1];

    // حماية تلقائية في حال كان الرابط الحالي تالفاً يحتوي على [object Object]
    if (rawSemesterId.includes('[object') || rawSemesterId === '[object%20Object]') {
      window.location.hash = '#/semesters';
      return;
    }

    contentContainer.innerHTML = '<p style="color:var(--text);padding:1rem;">جاري تحميل المساقات...</p>';

    const navigationCallbacks = {
      onBack: () => {
        window.location.hash = '#/semesters';
      },
      onSelectCourse: (courseId) => {
        window.location.hash = `#/semesters/${rawSemesterId}/courses/${courseId}`;
      },
    };

    try {
      // المحاولة الأولى: تمرير كائن الإعدادات { semesterId, onBack, onSelectCourse }
      currentPageCleanup = await renderCoursesPage(contentContainer, {
        semesterId: rawSemesterId,
        ...navigationCallbacks,
      });
    } catch (err) {
      console.warn('Initial renderCoursesPage call failed, trying direct ID parameter:', err);
      try {
        // المحاولة الثانية (Fallback): تمرير semesterId كنص مباشر للدوال التي تتوقع المعرف في المعامل الثاني
        currentPageCleanup = await renderCoursesPage(contentContainer, rawSemesterId, navigationCallbacks);
      } catch (fallbackErr) {
        console.error('Both renderCoursesPage signatures failed:', fallbackErr);
        contentContainer.innerHTML = `
          <div style="padding:1.5rem;color:#ef4444;">
            <h3>فشل تحميل صفحة المساقات</h3>
            <p>${escapeHtml(fallbackErr.message || err.message)}</p>
            <button type="button" class="btn-secondary" onclick="window.location.hash='#/semesters'">
              العودة للفصول الدراسية
            </button>
          </div>
        `;
      }
    }

    updateActiveNav('nav-link-semesters');
    return;
  }

  // 4. الشاشة الافتراضية: الفصول الدراسية (استخراج الـ ID بمرونة)
  contentContainer.innerHTML = '<p style="color:var(--text);padding:1rem;">جاري تحميل الفصول الدراسية...</p>';
  try {
    currentPageCleanup = await renderSemestersPage(contentContainer, {
      onSelectSemester: (target) => {
        const semesterId = (target && typeof target === 'object') ? (target.id || target.semesterId) : target;
        if (semesterId) {
          window.location.hash = `#/semesters/${semesterId}/courses`;
        }
      },
    });
  } catch (err) {
    console.error('Failed to render semesters page:', err);
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
  links.forEach((l) => l.classList.remove('active'));
  const target = document.getElementById(activeId);
  if (target) target.classList.add('active');
}

function showAuth() {
  rootEl.innerHTML = '';
  renderAuthPage(rootEl);
}

window.addEventListener('hashchange', handleRoute);