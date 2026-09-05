// src/pages/CoursesPage.js
// الطبقة اللي بتربط: api (courses.js, topics.js) ↔ state (store.js) ↔ components
// (CourseForm.js, LogAchievementModal.js)

import { fetchCoursesBySemester, createCourse } from '../api/courses.js';
import {
  fetchIncompleteLeafTopics,
  createTopic,
  completeTopicAndAdvance,
} from '../api/topics.js';
import { setCourses, getState, subscribe } from '../state/store.js';
import { renderCourseForm } from '../components/CourseForm.js';
import { renderLogAchievementModal } from '../components/LogAchievementModal.js';

export async function renderCoursesPage(
  container,
  { semester, onBack, onSelectCourse }
) {
  const { courses, error } = await fetchCoursesBySemester(semester.id);

  if (error) {
    container.innerHTML = `
      <p style="color:#e05252;">
        فشل تحميل المساقات: ${error.message}
      </p>
    `;
    return () => {}; // ما في اشتراك انفتح، unsubscribe فارغة وآمنة
  }

  setCourses(courses);

  function render() {
    renderCourseForm(container, {
      semesterTitle: semester.title,
      courses: getState('courses'),
      onCreate: handleCreate,
      onBack,
      onSelectCourse,
      onLogAchievement: handleLogAchievement,
    });
  }

  // أول رسم
  render();

  // أي تحديث لاحق على courses (بعد create أو بعد تسجيل إنجاز) بيعيد رسم القائمة تلقائيًا
  const unsubscribe = subscribe('courses:changed', (event) => {
    renderCourseForm(container, {
      semesterTitle: semester.title,
      courses: event.detail,
      onCreate: handleCreate,
      onBack,
      onSelectCourse,
      onLogAchievement: handleLogAchievement,
    });
  });

  async function handleCreate({ title, creditHours, difficulty, priority }) {
    const { course, error } = await createCourse({
      semesterId: semester.id,
      title,
      creditHours,
      difficulty,
      priority,
    });

    if (error) return { error };

    setCourses([course, ...getState('courses')]);
    return { error: null };
  }

  async function refreshCourses() {
    const { courses: refreshed, error } = await fetchCoursesBySemester(semester.id);
    if (!error) setCourses(refreshed);
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

        // وضع "موضوع جديد" — ننشئ الـ Topic أول (كـ Root، بدون Parent)
        if (payload.mode === 'new') {
          const { topic, error: createError } = await createTopic({
            courseId,
            parentId: null,
            title: payload.title,
          });
          if (createError) return { error: createError };
          topicId = topic.id;
        }

        // بالحالتين: نسجّل الإنجاز، والـ RPC بتحدّث Current Position تلقائيًا (FR-6)
        const { error: completeError } = await completeTopicAndAdvance(courseId, topicId);
        if (completeError) return { error: completeError };

        await refreshCourses(); // نجيب القائمة المحدّثة (فيها Current Position الجديد)
        return { error: null };
      },
    });
  }

  // Cleanup عند مغادرة الصفحة — يُستدعى مركزيًا من main.js، مش ملفوف جوا onBack
  return () => {
    unsubscribe();
  };
}