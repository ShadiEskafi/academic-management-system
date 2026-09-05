// src/pages/CoursesPage.js
// الطبقة اللي بتربط: api (courses.js, topics.js) ↔ state (store.js) ↔ components
// (CourseForm.js, LogAchievementModal.js, CourseModals.js)

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

export async function renderCoursesPage(
  container,
  { semester, onBack, onSelectCourse, onContinueCourse }
) {
  const { courses: initialCourses, error } = await fetchCoursesBySemester(semester.id);

  if (error) {
    container.innerHTML = `
      <p style="color:#e05252;">
        فشل تحميل المساقات: ${error.message}
      </p>
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
    const { course, error } = await createCourse({
      semesterId: semester.id,
      title,
      creditHours,
      difficulty,
      priority,
    });

    if (error) return { error };

    await refreshCourses();
    return { error: null };
  }

  async function refreshCourses() {
    const { courses: refreshed, error } = await fetchCoursesBySemester(semester.id);
    if (!error) {
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
    const { topics: existingTopics, error } = await fetchIncompleteLeafTopics(courseId);

    if (error) {
      alert('فشل تحميل قائمة المواضيع: ' + error.message);
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