// src/main.js

import "./style.css";

import { onAuthStateChange, signOut } from "./api/auth.js";

import { fetchSemesterById } from "./api/semesters.js";

import { setCurrentUser } from "./state/store.js";

import { navigate, getCurrentRoute, onRouteChange } from "./state/router.js";

import { renderAppShell } from "./components/AppShell.js";

import { renderAuthPage } from "./pages/AuthPage.js";

import { renderSemestersPage } from "./pages/SemestersPage.js";

import { renderCoursesPage } from "./pages/CoursesPage.js";

import { renderCourseDetailPage } from "./pages/CourseDetailPage.js";

const root = document.querySelector("#app");

let contentContainer = null;

// Cleanup للصفحة الحالية
let currentPageCleanup = null;

// رقم متزايد لكل عملية Render
// يستخدم لمنع Race Condition بين طلبات async
let renderVersion = 0;

async function cleanupCurrentPage() {
  if (typeof currentPageCleanup === "function") {
    currentPageCleanup();
    currentPageCleanup = null;
  }
}

async function renderCurrentRoute() {
  if (!contentContainer) {
    return;
  }

  // Route Guard
  // إذا ما في مستخدم حالي، ما بنسمح بتحميل صفحات التطبيق
  if (!currentUserId) {
    showAuth();
    return;
  }

  const version = ++renderVersion;
  const route = getCurrentRoute();

  // تنظيف الصفحة السابقة قبل رسم الصفحة الجديدة
  await cleanupCurrentPage();

  // التأكد أن المسار لم يتغير أثناء الـ cleanup
  if (version !== renderVersion) {
    return;
  }

  // --------------------------------------------------
  // Course Detail
  // --------------------------------------------------
  if (route.name === "course-detail") {
    const { semester, error } = await fetchSemesterById(route.semesterId);

    // Race Condition Guard
    if (
      version !== renderVersion ||
      !currentUserId ||
      getCurrentRoute().name !== "course-detail" ||
      getCurrentRoute().semesterId !== route.semesterId ||
      getCurrentRoute().courseId !== route.courseId
    ) {
      return;
    }

    if (error || !semester) {
      navigate("/semesters");
      return;
    }

    const course = semester.courses?.find((item) => item.id === route.courseId);

    currentPageCleanup = await renderCourseDetailPage(contentContainer, {
      courseId: route.courseId,
      onBack: () => {
        navigate(`/semesters/${route.semesterId}/courses`);
      },
    });

    return;
  }

  // --------------------------------------------------
  // Courses
  // --------------------------------------------------
  if (route.name === "courses") {
    const { semester, error } = await fetchSemesterById(route.semesterId);

    // Race Condition Guard
    if (
      version !== renderVersion ||
      !currentUserId ||
      getCurrentRoute().name !== "courses" ||
      getCurrentRoute().semesterId !== route.semesterId
    ) {
      return;
    }

    if (error || !semester) {
      // فصل غير موجود/محذوف/مش تبع هالمستخدم
      // نرجع لقائمة الفصول
      navigate("/semesters");
      return;
    }

    currentPageCleanup = await renderCoursesPage(contentContainer, {
      semester,
      onBack: () => navigate("/semesters"),
      onSelectCourse: (course) => {
        navigate(`/semesters/${semester.id}/courses/${course.id}`);
      },
    });

    return;
  }

  // --------------------------------------------------
  // Semesters
  // --------------------------------------------------
  currentPageCleanup = await renderSemestersPage(contentContainer, {
    onSelectSemester: (semester) => {
      navigate(`/semesters/${semester.id}/courses`);
    },
  });
}

function enterApp(user) {
  contentContainer = renderAppShell(root, {
    userEmail: user.email,

    onSignOut: () => {
      signOut();
    },
  });

  renderCurrentRoute();
}

async function showAuth() {
  await cleanupCurrentPage();

  contentContainer = null;

  renderAuthPage(root);
}

// أي تغيير بالـ URL
// بما فيه Back / Forward / navigation
// يعيد رسم الصفحة المناسبة
onRouteChange(() => {
  renderCurrentRoute();
});

// --------------------------------------------------
// Session Management
// --------------------------------------------------

// نقطة الدخول الوحيدة لحالة الجلسة بكامل التطبيق
let currentUserId = null;

onAuthStateChange((session) => {
  const user = session?.user ?? null;

  setCurrentUser(user);

  if (user) {
    if (currentUserId !== user.id) {
      currentUserId = user.id;

      enterApp(user);
    }

    return;
  }

  if (currentUserId !== null) {
    currentUserId = null;
  }

  showAuth();
});
