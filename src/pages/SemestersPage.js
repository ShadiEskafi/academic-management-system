// src/pages/SemestersPage.js
import {
  fetchSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  setCurrentSemester,
} from "../api/semesters.js";
import { setSemesters, getState, subscribe } from "../state/store.js";
import { renderSemesterForm } from "../components/SemesterForm.js";
import {
  renderEditSemesterModal,
  renderDeleteSemesterModal,
} from "../components/SemesterModals.js";
import { skeletons } from "../utils/skeletons.js";
import { icons } from "../utils/icons.js";
import { showToast } from "../utils/toast.js";
import { escapeHtml } from '../utils/sanitize.js';

export async function renderSemestersPage(
  container,
  { onSelectSemester } = {},
) {
  // عرض Skeleton فوري للشاشة قبل وصول البيانات من Supabase
  container.innerHTML = `
    <div class="page-container">
      <header style="margin-bottom:var(--space-6);">
        <h1 style="margin-bottom:var(--space-1);">الفصول الدراسية</h1>
        <p class="text-secondary" style="font-size:14px;">إدارة ومتابعة فصولك الدراسية والمساقات التابعة لها.</p>
      </header>

      <section class="card" style="margin-bottom:var(--space-6);min-height:72px;"></section>

      <section>
        ${skeletons.cards(3)}
      </section>
    </div>
  `;

  const { semesters, error } = await fetchSemesters();

  if (error) {
    container.innerHTML = `
      <div class="page-container">
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل الفصول الدراسية</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </div>
    `;
    return () => {};
  }

  setSemesters(semesters || []);

  function render() {
    renderSemesterForm(container, {
      semesters: getState("semesters") || [],
      onCreate: handleCreate,
      onSelectSemester,
      onEditSemester: handleOpenEdit,
      onDeleteSemester: handleOpenDelete,
      onSetCurrentSemester: handleSetCurrent,
    });
  }

  render();

  const unsubscribe = subscribe("semesters:changed", (event) => {
    renderSemesterForm(container, {
      semesters: event.detail || [],
      onCreate: handleCreate,
      onSelectSemester,
      onEditSemester: handleOpenEdit,
      onDeleteSemester: handleOpenDelete,
      onSetCurrentSemester: handleSetCurrent,
    });
  });

  async function refreshSemesters() {
    const { semesters: refreshed, error: refreshErr } = await fetchSemesters();
    if (!refreshErr) {
      setSemesters(refreshed || []);
    }
  }

  async function handleSetCurrent(semesterId) {
    const { error: setErr } = await setCurrentSemester(semesterId);
    if (setErr) {
      showToast("حدث خطأ أثناء تعيين الفصل الحالي", "error");
    } else {
      showToast("تم تعيين الفصل كفصل حالي نشط بنجاح", "success");
      await refreshSemesters();
    }
  }

  async function handleCreate({ title }) {
    const { error: createErr } = await createSemester({ title });
    if (createErr) return { error: createErr };
    await refreshSemesters();
    showToast("تمت إضافة الفصل الدراسي بنجاح", "success");
    return { error: null };
  }

  function handleOpenEdit(semester) {
    renderEditSemesterModal(semester, {
      onSave: async (semesterId, updates) => {
        const { error: updateErr } = await updateSemester(
          semesterId,
          updates,
        );
        if (updateErr) return { error: updateErr };
        await refreshSemesters();
        showToast("تم تعديل بيانات الفصل بنجاح", "success");
        return { error: null };
      },
    });
  }

  function handleOpenDelete(semester) {
    renderDeleteSemesterModal(semester, {
      onDelete: async (semesterId) => {
        const { error: deleteErr } = await deleteSemester(semesterId);
        if (deleteErr) return { error: deleteErr };
        await refreshSemesters();
        showToast("تم حذف الفصل الدراسي نهائياً", "info");
        return { error: null };
      },
    });
  }

  return () => {
    unsubscribe();
  };
}

