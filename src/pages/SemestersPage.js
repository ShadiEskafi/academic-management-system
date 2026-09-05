// src/pages/SemestersPage.js
// الطبقة اللي بتربط:
// api (semesters.js) ↔ state (store.js) ↔ components (SemesterForm.js, SemesterModals.js)

import {
  fetchSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
} from '../api/semesters.js';

import {
  setSemesters,
  getState,
  subscribe,
} from '../state/store.js';

import { renderSemesterForm } from '../components/SemesterForm.js';
import {
  renderEditSemesterModal,
  renderDeleteSemesterModal,
} from '../components/SemesterModals.js';

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

  // دمج أزرار التعديل والحذف برمجياً بجانب كل فصل لضمان عدم الحاجة لتعديل SemesterForm
  function attachSemesterActionButtons() {
    const semesterList = container.querySelector('#semester-list, ul');
    if (!semesterList) return;

    const listItems = semesterList.querySelectorAll('li');
    const currentSemesters = getState('semesters') || [];

    listItems.forEach((li, index) => {
      if (li.querySelector('.semester-actions-group')) return;

      if (
        li.textContent.includes('No semesters') ||
        li.textContent.includes('لا يوجد')
      ) {
        return;
      }

      const btnWithId = li.querySelector('[data-semester-id], [data-id]');
      const id = btnWithId?.dataset?.semesterId || btnWithId?.dataset?.id;
      const semester = id
        ? currentSemesters.find((s) => s.id === id)
        : currentSemesters[index];

      if (!semester) return;

      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.gap = '0.5rem';

      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'semester-actions-group';
      actionsGroup.style.cssText = 'display:flex;gap:6px;align-items:center;flex-shrink:0;';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'semester-action-btn edit';
      editBtn.title = 'تعديل الفصل';
      editBtn.textContent = '✏️ تعديل';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleOpenEdit(semester);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'semester-action-btn delete';
      deleteBtn.title = 'حذف الفصل';
      deleteBtn.textContent = '🗑️ حذف';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleOpenDelete(semester);
      });

      actionsGroup.appendChild(editBtn);
      actionsGroup.appendChild(deleteBtn);
      li.appendChild(actionsGroup);
    });
  }

  function render() {
    renderSemesterForm(container, {
      semesters: getState('semesters'),
      onCreate: handleCreate,
      onSelectSemester,
      onEditSemester: handleOpenEdit,
      onDeleteSemester: handleOpenDelete,
    });

    attachSemesterActionButtons();
  }

  render();

  const unsubscribe = subscribe(
    'semesters:changed',
    (event) => {
      renderSemesterForm(container, {
        semesters: event.detail,
        onCreate: handleCreate,
        onSelectSemester,
        onEditSemester: handleOpenEdit,
        onDeleteSemester: handleOpenDelete,
      });

      attachSemesterActionButtons();
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

  function handleOpenEdit(semester) {
    renderEditSemesterModal(semester, {
      onSave: async (semesterId, updates) => {
        const { semester: updated, error: updateErr } = await updateSemester(
          semesterId,
          updates
        );

        if (updateErr) return { error: updateErr };

        const current = getState('semesters') || [];
        setSemesters(
          current.map((s) => (s.id === semesterId ? { ...s, ...updated } : s))
        );

        return { error: null };
      },
    });
  }

  function handleOpenDelete(semester) {
    renderDeleteSemesterModal(semester, {
      onDelete: async (semesterId) => {
        const { error: deleteErr } = await deleteSemester(semesterId);

        if (deleteErr) return { error: deleteErr };

        const current = getState('semesters') || [];
        setSemesters(current.filter((s) => s.id !== semesterId));

        return { error: null };
      },
    });
  }

  return () => {
    unsubscribe();
  };
}