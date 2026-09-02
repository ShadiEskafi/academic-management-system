// src/pages/SemestersPage.js
// الطبقة اللي بتربط: api (semesters.js) ↔ state (store.js) ↔ components (SemesterForm.js)
// بتستخدم subscribe عشان القائمة تتحدث تلقائيًا لما الـ state يتغيّر (event.detail).

import { fetchSemesters, createSemester } from '../api/semesters.js';
import { setSemesters, getState, subscribe } from '../state/store.js';
import { renderSemesterForm } from '../components/SemesterForm.js';

export async function renderSemestersPage(container, { onSelectSemester } = {}) {
  // أول تحميل: نجيب الداتا من Supabase ونحطها بالـ store
  const { semesters, error } = await fetchSemesters();
  if (error) {
    container.innerHTML = `<p style="color:#e05252;">فشل تحميل الفصول: ${error.message}</p>`;
    return;
  }
  setSemesters(semesters);

  // أول رسم — من الـ state الحالي (getState لأنه مفيش حدث لسا صار)
  renderSemesterForm(container, {
    semesters: getState('semesters'),
    onCreate: handleCreate,
    onSelectSemester,
  });

  // أي تحديث لاحق على semesters (بعد create) بيعيد رسم القائمة تلقائيًا
  subscribe('semesters:changed', (event) => {
    renderSemesterForm(container, {
      semesters: event.detail,
      onCreate: handleCreate,
      onSelectSemester,
    });
  });

  async function handleCreate({ title }) {
    const { semester, error } = await createSemester({ title });
    if (error) return { error };

    setSemesters([semester, ...getState('semesters')]);
    return { error: null };
  }
}