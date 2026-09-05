// src/main.js

import './style.css';

import { onAuthStateChange, signOut } from './api/auth.js';
import { fetchSemesterById } from './api/semesters.js';
import { fetchCourseById } from './api/courses.js';

import { setCurrentUser } from './state/store.js';

import {
  navigate,
  getCurrentRoute,
  onRouteChange,
} from './state/router.js';

import { renderAppShell } from './components/AppShell.js';

import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';
import { renderCourseDetailPage } from './pages/CourseDetailPage.js';

const root = document.querySelector('#app');

let contentContainer = null;

// بيتتبع الصفحة الحالية حتى نقدر ننظف أي Cleanup قبل الانتقال
let currentPageCleanup = null;

// رقم متزايد لكل عملية Render.
// الهدف منع استجابة Fetch قديمة من رسم صفحة بعد ما يكون المسار تغيّر.
let renderRequestId = 0;

async function renderCurrentRoute() {
  if (!contentContainer) {
    return;
  }

  const requestId = ++renderRequestId;

  const route = getCurrentRoute();

  // تنظيف الصفحة السابقة قبل رسم الصفحة الجديدة
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  if (route.name === 'course-detail') {
    const { course, error } = await fetchCourseById(
      route.courseId
    );

    // المسار تغيّر أثناء الانتظار
    if (requestId !== renderRequestId) {
      return;
    }

    if (error || !course) {
      navigate('/semesters');

      return;
    }

    // التأكد أن الـ Course تابع للـ Semester الموجود في الرابط
    if (course.semester_id !== route.semesterId) {
      navigate('/semesters');

      return;
    }

    currentPageCleanup = await renderCourseDetailPage(
      contentContainer,
      {
        courseId: route.courseId,
        currentPositionTopicId:
          route.currentPositionTopicId,

        onBack: () => {
          navigate(
            `/semesters/${route.semesterId}/courses`
          );
        },
      }
    );

    return;
  }

  if (route.name === 'courses') {
    const { semester, error } = await fetchSemesterById(
      route.semesterId
    );

    // المسار تغيّر أثناء الانتظار
    if (requestId !== renderRequestId) {
      return;
    }

    if (error || !semester) {
      // فصل غير موجود/محذوف/مش تبع هالمستخدم
      navigate('/semesters');

      return;
    }

    currentPageCleanup = await renderCoursesPage(
      contentContainer,
      {
        semester,

        onBack: () => {
          navigate('/semesters');
        },

        onSelectCourse: (courseId) => {
          navigate(
            `/semesters/${semester.id}/courses/${courseId}`
          );
        },

        onContinueCourse: (courseId, topicId) => {
          navigate(
            `/semesters/${semester.id}/courses/${courseId}?topicId=${encodeURIComponent(topicId)}`
          );
        },
      }
    );

    return;
  }

  currentPageCleanup = await renderSemestersPage(
    contentContainer,
    {
      onSelectSemester: (semester) => {
        navigate(
          `/semesters/${semester.id}/courses`
        );
      },
    }
  );
}

function enterApp(user) {
  contentContainer = renderAppShell(root, {
    userEmail: user.email,
    onSignOut: () => signOut(),
  });

  renderCurrentRoute();
}

function showAuth() {
  renderRequestId += 1;

  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  contentContainer = null;

  renderAuthPage(root);
}

// أي تغيير بالـ URL يعيد رسم الصفحة المناسبة.
// Refresh و Back/Forward يظلون مدعومين عن طريق الـ Hash Router.
onRouteChange(() => renderCurrentRoute());

// نقطة الدخول الوحيدة لحالة الجلسة بكامل التطبيق.
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