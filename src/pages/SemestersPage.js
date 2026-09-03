// src/pages/SemestersPage.js
// الطبقة اللي بتربط:
// api (semesters.js) ↔ state (store.js) ↔ components (SemesterForm.js)
// بتستخدم subscribe عشان القائمة تتحدث تلقائيًا لما الـ state يتغيّر.

import {
  fetchSemesters,
  createSemester,
} from '../api/semesters.js';

import {
  setSemesters,
  getState,
  subscribe,
} from '../state/store.js';

import { renderSemesterForm } from '../components/SemesterForm.js';

export async function renderSemestersPage(
  container,
  { onSelectSemester } = {}
) {
  const { semesters, error } = await fetchSemesters();

  if (error) {
    container.innerHTML = `
      <p style="color:#e05252;">
        فشل تحميل الفصول: ${error.message}
      </p>
    `;

    return () => {};
  }

  setSemesters(semesters);

  function render() {
    renderSemesterForm(container, {
      semesters: getState('semesters'),
      onCreate: handleCreate,
      onSelectSemester,
    });
  }

  // أول رسم
  render();

  // أي تحديث لاحق على semesters
  const unsubscribe = subscribe(
    'semesters:changed',
    (event) => {
      renderSemesterForm(container, {
        semesters: event.detail,
        onCreate: handleCreate,
        onSelectSemester,
      });
    }
  );

  async function handleCreate({ title }) {
    const { semester, error } = await createSemester({
      title,
    });

    if (error) {
      return { error };
    }

    setSemesters([
      semester,
      ...getState('semesters'),
    ]);

    return {
      error: null,
    };
  }

  // Cleanup عند مغادرة الصفحة
  return () => {
    unsubscribe();
  };
}