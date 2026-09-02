// src/pages/CoursesPage.js
// الطبقة اللي بتربط: api (courses.js) ↔ state (store.js) ↔ components (CourseForm.js)

import { fetchCoursesBySemester, createCourse } from '../api/courses.js';
import { setCourses, getState, subscribe } from '../state/store.js';
import { renderCourseForm } from '../components/CourseForm.js';

export async function renderCoursesPage(container, { semester, onBack }) {
  const { courses, error } = await fetchCoursesBySemester(semester.id);
  if (error) {
    container.innerHTML = `<p style="color:#e05252;">فشل تحميل المساقات: ${error.message}</p>`;
    return;
  }
  setCourses(courses);

  renderCourseForm(container, {
    semesterTitle: semester.title,
    courses: getState('courses'),
    onCreate: handleCreate,
    onBack,
  });

  const unsubscribe = subscribe('courses:changed', (event) => {
    renderCourseForm(container, {
      semesterTitle: semester.title,
      courses: event.detail,
      onCreate: handleCreate,
      onBack: () => { unsubscribe(); onBack(); }, // ننضّف الاشتراك قبل ما نطلع من الصفحة
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
}