// src/main.js
import './style.css';
import { onAuthStateChange, signOut } from './api/auth.js';
import { fetchSemesterById } from './api/semesters.js';
import { setCurrentUser } from './state/store.js';
import { navigate, getCurrentRoute, onRouteChange } from './state/router.js';
import { renderAppShell } from './components/AppShell.js';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';

const root = document.querySelector('#app');
let contentContainer = null; // بيتحدد بعد enterApp، الراوتر بيرسم فيه حسب المسار الحالي

async function renderCurrentRoute() {
  if (!contentContainer) return; // لسا ما دخلنا التطبيق (بعدنا بشاشة Auth)

  const route = getCurrentRoute();

  if (route.name === 'courses') {
    const { semester, error } = await fetchSemesterById(route.semesterId);
    if (error || !semester) {
      // فصل غير موجود/محذوف/مش تبع هالمستخدم (RLS) — نرجع لقائمة الفصول
      navigate('/semesters');
      return;
    }
    renderCoursesPage(contentContainer, {
      semester,
      onBack: () => navigate('/semesters'),
    });
  } else {
    renderSemestersPage(contentContainer, {
      onSelectSemester: (semester) => navigate(`/semesters/${semester.id}/courses`),
    });
  }
}

function enterApp(user) {
  contentContainer = renderAppShell(root, {
    userEmail: user.email,
    onSignOut: () => signOut(),
  });
  renderCurrentRoute();
}

function showAuth() {
  contentContainer = null;
  renderAuthPage(root);
}

// أي تغيير بالـ URL (بما فيه الرجوع/التقدم بالمتصفح Back/Forward) بيعيد رسم
// الصفحة المناسبة — هيك الـ Refresh بيحافظ على مكانك، مش يرجعك لنقطة البداية
onRouteChange(() => renderCurrentRoute());

// نقطة الدخول الوحيدة لحالة الجلسة بكامل التطبيق — onAuthStateChange بيتأكد
// فعليًا من صلاحية الجلسة مع Supabase (مش قراءة محلية عمياء من localStorage)،
// وبيراقب أي تغيير مستقبلي (انتهاء/تجديد Token، تسجيل خروج من جهاز تاني...).
// بنتتبع currentUserId عشان ما نعيد رسم كل الـ Shell عبثًا عند أحداث زي
// تجديد الـ Token لنفس المستخدم (TOKEN_REFRESHED).
let currentUserId = null;

onAuthStateChange((session) => {
  const user = session?.user ?? null;
  setCurrentUser(user);

  if (user) {
    if (currentUserId !== user.id) {
      currentUserId = user.id;
      enterApp(user);
    }
  } else {
    if (currentUserId !== null) {
      currentUserId = null;
    }
    showAuth();
  }
});