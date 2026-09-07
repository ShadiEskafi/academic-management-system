// src/pages/CoursesPage.js
// شاشة المساقات وفق الـ Design System مع دعم الـ Skeletons الفوري
import {
  fetchCoursesBySemester,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../api/courses.js';
import {
  fetchIncompleteLeafTopics,
  createTopic,
  completeTopicAndAdvance,
} from '../api/topics.js';
import { supabase } from '../api/supabaseClient.js';
import { setCourses, getState, subscribe } from '../state/store.js';
import { renderCourseForm } from '../components/CourseForm.js';
import { renderLogAchievementModal } from '../components/LogAchievementModal.js';
import {
  renderEditCourseModal,
  renderDeleteCourseModal,
} from '../components/CourseModals.js';
import { skeletons } from '../utils/skeletons.js';
import { icons } from '../utils/icons.js';

export async function renderCoursesPage(
  container,
  options = {},
  fallbackCallbacks = {}
) {
  let semester = options?.semester || (typeof options === 'object' && options?.id ? options : null);
  const semesterId =
    typeof options === 'string'
      ? options
      : (options?.semesterId || semester?.id || options?.id);

  const onBack = options?.onBack || fallbackCallbacks?.onBack;
  const onSelectCourse = options?.onSelectCourse || fallbackCallbacks?.onSelectCourse;
  const onContinueCourse = options?.onContinueCourse || fallbackCallbacks?.onContinueCourse;

  // 1. عرض الـ Skeleton فوراً دون انتظار أي طلب شبكة
  container.innerHTML = `
    <div class="page-container">
      <nav style="margin-bottom:var(--space-4);">
        <div class="skeleton" style="width:140px;height:24px;"></div>
      </nav>
      <header style="margin-bottom:var(--space-6);">
        <div class="skeleton skeleton-title" style="width:260px;height:32px;margin-bottom:var(--space-1);"></div>
        <div class="skeleton skeleton-text" style="width:380px;"></div>
      </header>
      <section class="card" style="margin-bottom:var(--space-6);min-height:86px;"></section>
      <section>
        ${skeletons.cards(3)}
      </section>
    </div>
  `;

  if (!semester || !semester.title) {
    if (!semesterId) {
      container.innerHTML = `
        <div class="page-container">
          <div class="card error-state">
            <div class="error-state-icon">${icons.alertTriangle(28)}</div>
            <h3>معرف الفصل الدراسي غير محدد</h3>
            <button type="button" class="btn-secondary" onclick="window.location.hash='#/semesters'">
              العودة للفصول الدراسية
            </button>
          </div>
        </div>
      `;
      return () => {};
    }

    const { data: semesterData, error: semesterFetchErr } = await supabase
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .maybeSingle();

    if (semesterFetchErr || !semesterData) {
      container.innerHTML = `
        <div class="page-container">
          <div class="card error-state">
            <div class="error-state-icon">${icons.alertTriangle(28)}</div>
            <h3>فشل تحميل بيانات الفصل الدراسي</h3>
            <p>${escapeHtml(semesterFetchErr?.message || 'لم يتم العثور على الفصل الدراسي المطلوب.')}</p>
            <button type="button" class="btn-secondary" onclick="window.location.hash='#/semesters'">
              العودة للفصول الدراسية
            </button>
          </div>
        </div>
      `;
      return () => {};
    }

    semester = semesterData;
  }

  const { courses: initialCourses, error } = await fetchCoursesBySemester(semester.id);

  if (error) {
    container.innerHTML = `
      <div class="page-container">
        <div class="card error-state">
          <div class="error-state-icon">${icons.alertTriangle(28)}</div>
          <h3>فشل تحميل المساقات</h3>
          <p>${escapeHtml(error.message)}</p>
          <button type="button" class="btn-secondary" onclick="window.location.hash='#/semesters'">
            العودة للفصول الدراسية
          </button>
        </div>
      </div>
    `;
    return () => {};
  }

  const enrichedCourses = await enrichCoursesWithCurrentPosition(initialCourses);
  setCourses(enrichedCourses);

  function render() {
    renderCourseForm(container, {
      semesterTitle: semester.title,
      courses: getState('courses'),
      onCreate: handleCreate,
      onBack,
      onSelectCourse,
      onContinueCourse,
      onLogAchievement: handleLogAchievement,
      onEditCourse: handleOpenEdit,
      onDeleteCourse: handleOpenDelete,
    });
  }

  render();

  const unsubscribe = subscribe('courses:changed', (event) => {
    renderCourseForm(container, {
      semesterTitle: semester.title,
      courses: event.detail,
      onCreate: handleCreate,
      onBack,
      onSelectCourse,
      onContinueCourse,
      onLogAchievement: handleLogAchievement,
      onEditCourse: handleOpenEdit,
      onDeleteCourse: handleOpenDelete,
    });
  });

  async function enrichCoursesWithCurrentPosition(coursesList) {
    return Promise.all(
      coursesList.map(async (course) => {
        let topicId = course.current_position_topic_id;
        let topicTitle =
          course.current_topic?.title ||
          course.current_position_topic_title ||
          course.current_topic_title ||
          null;

        if (topicId && !topicTitle) {
          const { data: topicData } = await supabase
            .from('topics')
            .select('title')
            .eq('id', topicId)
            .maybeSingle();

          if (topicData) {
            topicTitle = topicData.title;
          }
        }

        if (!topicId) {
          const { topics } = await fetchIncompleteLeafTopics(course.id);
          if (topics && topics.length > 0) {
            const firstPending = topics[0];
            topicId = firstPending.id;
            topicTitle = firstPending.title;
          }
        }

        return {
          ...course,
          current_position_topic_id: topicId,
          current_position_topic_title: topicTitle,
          current_topic_title: topicTitle,
          current_topic: topicTitle ? { id: topicId, title: topicTitle } : null,
        };
      })
    );
  }

  async function handleCreate({ title, creditHours, difficulty, priority }) {
    const { error: createError } = await createCourse({
      semesterId: semester.id,
      title,
      creditHours,
      difficulty,
      priority,
    });

    if (createError) return { error: createError };

    await refreshCourses();
    return { error: null };
  }

  async function refreshCourses() {
    const { courses: refreshed, error: refreshError } = await fetchCoursesBySemester(semester.id);
    if (!refreshError) {
      const enriched = await enrichCoursesWithCurrentPosition(refreshed);
      setCourses(enriched);
    }
  }

  function handleOpenEdit(course) {
    renderEditCourseModal(course, {
      onSave: async (courseId, updates) => {
        const { error: updateErr } = await updateCourse(courseId, updates);
        if (updateErr) return { error: updateErr };

        await refreshCourses();
        return { error: null };
      },
    });
  }

  function handleOpenDelete(course) {
    renderDeleteCourseModal(course, {
      onDelete: async (courseId) => {
        const { error: deleteErr } = await deleteCourse(courseId);
        if (deleteErr) return { error: deleteErr };

        await refreshCourses();
        return { error: null };
      },
    });
  }

  async function handleLogAchievement(courseId) {
    const { topics: existingTopics, error: topicsErr } = await fetchIncompleteLeafTopics(courseId);

    if (topicsErr) {
      console.error('فشل تحميل قائمة المواضيع:', topicsErr);
      return;
    }

    renderLogAchievementModal({
      existingTopics,
      onClose: () => {},
      onSubmit: async (payload) => {
        let topicId = payload.topicId;

        if (payload.mode === 'new') {
          const { topic, error: createError } = await createTopic({
            courseId,
            parentId: null,
            title: payload.title,
          });

          if (createError) return { error: createError };
          topicId = topic.id;
        }

        const { error: completeError } = await completeTopicAndAdvance(
          courseId,
          topicId
        );

        if (completeError) return { error: completeError };

        await refreshCourses();
        return { error: null };
      },
    });
  }

  return () => {
    unsubscribe();
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}