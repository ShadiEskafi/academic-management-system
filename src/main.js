// src/main.js
// نقطة الدخول الرئيسية للتطبيق — الراوتر التصريحي وإدارة دورة حياة الجلسة

import './style.css';
import { supabase } from './api/supabaseClient.js';
import { renderLandingPage } from './pages/LandingPage.js';
import { renderOnboardingPage } from './pages/OnboardingPage.js';
import { renderDashboardPage } from './pages/DashboardPage.js';
import { renderWeeklyPlannerPage } from './pages/WeeklyPlannerPage.js';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';
import { renderCourseDetailPage } from './pages/CourseDetailPage.js';
import { renderAvailabilityPage } from './pages/AvailabilityPage.js';
import { renderAdminPage } from './pages/AdminPage.js';
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

let currentUser = null;
let contentContainer = null;
let isShellMounted = false;
let landingCleanup = null;
let onboardingCleanup = null;
let adminCleanup = null;
let isOnboardedCache = null;
let userRoleCache = null;

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

// مسار احتياطي (404 داخلي) — توجيه للوحة التحكم فقط لمسارات AppShell المجهولة
setNotFoundHandler(async ({ path } = {}) => {
  const clean = path || getCleanPath();
  if (clean === '/admin' || clean === '/' || clean === '/login' || clean === '/onboarding') {
    return null;
  }
  navigate('/dashboard');
  return null;
});

// =========================================================
// إدارة دورة حياة المصادقة والتوجيه (Auth Lifecycle & Routing)
// =========================================================

function getCleanPath() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0] || '/';
}

function isProtectedRoute(path) {
  return (
    path === '/dashboard' ||
    path === '/admin' ||
    path === '/planner' ||
    path === '/availability' ||
    path === '/semesters' ||
    path.startsWith('/semesters/')
  );
}

function clearLandingPage() {
  if (landingCleanup) {
    try {
      landingCleanup();
    } catch (err) {
      console.error('Error cleaning up landing page:', err);
    }
    landingCleanup = null;
  }
}

function clearOnboardingPage() {
  if (onboardingCleanup) {
    try {
      onboardingCleanup();
    } catch (err) {
      console.error('Error cleaning up onboarding page:', err);
    }
    onboardingCleanup = null;
  }
}

function clearAdminPage() {
  if (adminCleanup) {
    try {
      adminCleanup();
    } catch (err) {
      console.error('Error cleaning up admin page:', err);
    }
    adminCleanup = null;
  }
}

/**
 * فحص حالة التهيئة للمستخدم مع نظام تخزين مؤقت محلي (Cache)
 */
async function checkIsOnboarded(user) {
  if (!user) return false;
  if (isOnboardedCache !== null) return isOnboardedCache;

  // 1. فحص user_metadata
  if (user.user_metadata?.is_onboarded === true) {
    isOnboardedCache = true;
    return true;
  }

  // 2. فحص جدول profiles في Supabase
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_onboarded')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data && data.is_onboarded !== undefined) {
      isOnboardedCache = Boolean(data.is_onboarded);
      return isOnboardedCache;
    }
  } catch (err) {
    console.warn('Profiles table check skipped:', err);
  }

  // 3. Fallback للمستخدمين الحاليين: فحص وجود مساقات مسجلة مسبقاً
  try {
    const { count, error } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!error && typeof count === 'number' && count > 0) {
      isOnboardedCache = true;
      return true;
    }
  } catch (err) {
    console.warn('Courses count check skipped:', err);
  }

  isOnboardedCache = false;
  return false;
}

/**
 * فحص رتبة المستخدم الحالي مع نظام تخزين مؤقت محلي (Cache)
 */
async function getUserRole(user) {
  if (!user) return 'student';
  if (userRoleCache !== null) return userRoleCache;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && data?.role) {
      userRoleCache = data.role;
      return userRoleCache;
    }
  } catch (err) {
    console.warn('Profiles role check skipped:', err);
  }

  userRoleCache = 'student';
  return userRoleCache;
}

/**
 * معالج تبديل المشهد الرئيسي بين صفحة الهبوط، صفحة الدخول، معالج التهيئة، وهيكل التطبيق
 */
async function renderRouteView() {
  const path = getCleanPath();

  // 1. الزائر غير المسجل (Guest)
  if (!currentUser) {
    isOnboardedCache = null;
    if (isShellMounted) {
      stopRouter();
      isShellMounted = false;
      contentContainer = null;
    }
    clearOnboardingPage();
    clearAdminPage();

    if (path === '/login') {
      clearLandingPage();
      rootEl.innerHTML = '';
      renderAuthPage(rootEl);
      return;
    }

    if (path === '/' || path === '') {
      clearLandingPage();
      rootEl.innerHTML = '';
      landingCleanup = renderLandingPage(rootEl, { user: null });
      return;
    }

    // محاولة دخول مسار محمي أثناء عدم تسجيل الدخول -> تحويل لصفحة الدخول
    if (isProtectedRoute(path) || path === '/onboarding') {
      navigate('/login');
      return;
    }

    // أي مسار آخر غير معروف للزائر -> توجيه لصفحة الهبوط
    navigate('/');
    return;
  }

  // 2. المستخدم المسجل (Authenticated User)
  // معالجة مسار لوحة الأدمن المستقلة (#/admin)
  if (path === '/admin') {
    clearLandingPage();
    clearOnboardingPage();

    const role = await getUserRole(currentUser);
    if (role !== 'admin') {
      // ليس أدمن -> عرض كارت 403 Forbidden بشكل مستقل
      clearAdminPage();
      if (isShellMounted) {
        stopRouter();
        isShellMounted = false;
        contentContainer = null;
      }
      rootEl.innerHTML = `
        <div class="page-container" style="display:flex;align-items:center;justify-content:center;min-height:80vh;">
          <div class="card error-state" style="max-width:520px;text-align:center;padding:var(--space-8);">
            <div class="error-state-icon" style="color:var(--color-danger);margin-bottom:var(--space-4);" aria-hidden="true">${icons.shield(36)}</div>
            <h2 style="margin:0 0 var(--space-2);color:var(--color-danger);font-size:22px;">غير مصرح بالدخول (403 Forbidden)</h2>
            <p style="color:var(--color-text-secondary);font-size:14px;margin-bottom:var(--space-6);line-height:1.6;">
              هذه الصفحة مخصصة لمشرفي منصة «مِحْوَر» فقط. ليس لدى حسابك الصلاحيات الكافية للوصول إليها.
            </p>
            <button type="button" class="btn-primary" id="forbidden-go-dashboard">العودة إلى منصة الطالب</button>
          </div>
        </div>
      `;
      rootEl.querySelector('#forbidden-go-dashboard')?.addEventListener('click', () => {
        navigate('/dashboard');
      });
      return;
    }

    // المستخدم أدمن مصرح له -> حقن مباشر في rootEl كـ Standalone Cockpit مع استثناء Onboarding
    if (isShellMounted) {
      stopRouter();
      isShellMounted = false;
      contentContainer = null;
    }
    clearAdminPage();
    rootEl.innerHTML = '';
    adminCleanup = await renderAdminPage(rootEl, {
      user: currentUser,
      onSignOut: async () => {
        isOnboardedCache = null;
        userRoleCache = null;
        await supabase.auth.signOut();
        navigate('/');
      },
      onGoToStudent: () => {
        navigate('/dashboard');
      },
    });
    return;
  }

  // تنظيف صفحة الأدمن عند الانتقال لأي شاشة أخرى
  clearAdminPage();

  // فحص حالة التهيئة لمسارات الطالب
  const isUserOnboarded = await checkIsOnboarded(currentUser);

  // حارس التهيئة: إذا لم يكمل الطالب التهيئة يتم توجيهه إجبارياً إلى #/onboarding
  if (!isUserOnboarded) {
    if (path !== '/onboarding') {
      navigate('/onboarding');
      return;
    }

    // إخفاء الـ AppShell تماماً أثناء التهيئة لتوفير وضع تركيز كامل
    if (isShellMounted) {
      stopRouter();
      isShellMounted = false;
      contentContainer = null;
    }
    clearLandingPage();
    clearOnboardingPage();
    rootEl.innerHTML = '';
    onboardingCleanup = renderOnboardingPage(rootEl, {
      user: currentUser,
      onComplete: () => {
        isOnboardedCache = true;
        navigate('/dashboard');
      },
    });
    return;
  }

  // الطالب مكتمل التهيئة بالفعل
  clearOnboardingPage();

  if (path === '/onboarding') {
    navigate('/dashboard');
    return;
  }

  if (path === '/login') {
    // المسجل بالفعل يتم توجيهه للوحة التحكم مباشرة
    navigate('/dashboard');
    return;
  }

  if (path === '/' || path === '') {
    // عرض صفحة الهبوط في وضع المستخدم المسجل
    if (isShellMounted) {
      stopRouter();
      isShellMounted = false;
      contentContainer = null;
    }
    clearLandingPage();
    rootEl.innerHTML = '';
    landingCleanup = renderLandingPage(rootEl, { user: currentUser });
    return;
  }

  // مسارات الطالب المحمية داخل هيكل التطبيق (AppShell)
  clearLandingPage();
  if (!isShellMounted || !contentContainer) {
    rootEl.innerHTML = '';
    contentContainer = renderAppShell(rootEl, {
      userEmail: currentUser.email,
      onSignOut: async () => {
        isOnboardedCache = null;
        userRoleCache = null;
        await supabase.auth.signOut();
        navigate('/');
      },
    });
    isShellMounted = true;
    configureRouter({ getContainer: () => contentContainer });
    startRouter();

    setTimeout(() => {
      initGlobalSessionTracker(currentUser.id);
    }, 0);
  }
}

// الاستماع الموحد لتنقل المسارات عبر الـ hash
window.addEventListener('hashchange', () => {
  renderRouteView();
});

/**
 * فحص الجلسة الأولي فور تشغيل التطبيق (Bootstrapping)
 */
async function bootstrapApp() {
  const currentHash = window.location.hash;
  const currentPath = window.location.pathname;

  // إذا تم فتح الموقع بدون hash، يُعين كمسار افتراضي #/
  if (!currentHash || currentHash === '#') {
    window.location.hash = '#/';
  }

  const { data, error } = await supabase.auth.getSession();
  const session = !error && data?.session ? data.session : null;
  currentUser = session?.user ?? null;

  // توجيه تلقائي مع مراعاة استثناء مسار الأدمن من فحص التهيئة الإجباري
  if (currentUser) {
    const cleanPath = getCleanPath();
    const isAtAdmin = cleanPath === '/admin';
    if (!isAtAdmin) {
      const isUserOnboarded = await checkIsOnboarded(currentUser);
      if (!isUserOnboarded) {
        window.location.hash = '#/onboarding';
      } else {
        const isAtAuthOrToken =
          currentHash.startsWith('#access_token') ||
          currentHash.startsWith('#error') ||
          cleanPath === '/login' ||
          currentPath === '/login';

        if (isAtAuthOrToken) {
          window.location.hash = '#/dashboard';
        }
      }
    }
  }

  await renderRouteView();
}

/**
 * الاستماع لتغيرات حالة المصادقة اللاحقة (بما فيها عودة Google OAuth)
 */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') return;

  const newUser = session?.user ?? null;
  const prevUserId = currentUser?.id ?? null;
  currentUser = newUser;

  if (session) {
    isOnboardedCache = null;
    const currentHash = window.location.hash;
    const currentPath = window.location.pathname;
    const cleanPath = getCleanPath();
    const isAtAdmin = cleanPath === '/admin';

    if (!isAtAdmin) {
      const isUserOnboarded = await checkIsOnboarded(session.user);
      const isAtAuthOrToken =
        cleanPath === '/login' ||
        currentHash.startsWith('#access_token') ||
        currentHash.startsWith('#error') ||
        currentPath === '/login';

      if (!isUserOnboarded) {
        window.location.hash = '#/onboarding';
      } else if (isAtAuthOrToken) {
        window.location.hash = '#/dashboard';
      }
    }
  } else if (event === 'SIGNED_OUT') {
    clearAdminPage();
    isOnboardedCache = null;
    userRoleCache = null;
    window.location.hash = '#/';
  }

  // إذا تغيرت هوية المستخدم، نعيد بناء المشهد
  if (currentUser?.id !== prevUserId || !currentUser) {
    userRoleCache = null;
    clearAdminPage();
    if (!currentUser && isShellMounted) {
      stopRouter();
      isShellMounted = false;
      contentContainer = null;
    }
    await renderRouteView();
  }
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

// إطلاق التطبيق صراحة فور تحميل الملف
bootstrapApp();