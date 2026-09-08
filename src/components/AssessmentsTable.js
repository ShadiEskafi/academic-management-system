// src/components/AssessmentsTable.js
// جدول الاستحقاقات الموحد وفق الـ Design System (مع هياكل التحميل Skeletons)
import {
  fetchCourseAssessments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  createExam,
  updateExam,
  deleteExam,
} from '../api/assessments.js';

import { renderAssignmentFormModal } from './AssignmentForm.js';
import { renderExamFormModal } from './ExamForm.js';
import { icons } from '../utils/icons.js';
import { skeletons } from '../utils/skeletons.js';
import { escapeHtml } from '../utils/sanitize.js';

export function renderAssessmentsView(container, { courseId, onAssessmentsChange = () => {} }) {
  let filterCategory = 'all'; // all | exams | assignments
  let filterStatus = 'all';   // all | pending | completed
  let rawAssessmentsList = [];

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-4);flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button type="button" class="filter-pill active" data-cat="all">كافة الاستحقاقات</button>
        <button type="button" class="filter-pill" data-cat="exams">الاختبارات والكويزات</button>
        <button type="button" class="filter-pill" data-cat="assignments">الواجبات والمشاريع</button>
        
        <span style="color:var(--color-border);margin-inline:4px;">|</span>
        
        <button type="button" class="filter-pill-status filter-pill active" data-status="all">الكل</button>
        <button type="button" class="filter-pill-status filter-pill" data-status="pending">قيد الانتظار</button>
        <button type="button" class="filter-pill-status filter-pill" data-status="completed">المكتملة</button>
      </div>

      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
        <button
          type="button"
          id="btn-add-homework"
          class="btn-secondary"
          style="font-size:13px;min-height:36px;"
        >
          ${icons.plus(14)}
          <span>إضافة واجب / تكليف</span>
        </button>
        <button
          type="button"
          id="btn-add-exam"
          class="btn-primary"
          style="font-size:13px;min-height:36px;"
        >
          ${icons.plus(14)}
          <span>إضافة اختبار</span>
        </button>
      </div>
    </div>

    <!-- شريط احتساب أوزان الامتحانات من 100% -->
    <div id="exam-weights-bar-container" style="margin-bottom:var(--space-4);"></div>

    <div id="assessments-content-area"></div>
  `;

  const contentArea = container.querySelector('#assessments-content-area');
  const weightsContainer = container.querySelector('#exam-weights-bar-container');
  const addAssignmentBtn = container.querySelector('#btn-add-homework');
  const addExamBtn = container.querySelector('#btn-add-exam');

  const catFilterBtns = container.querySelectorAll('.filter-pill:not(.filter-pill-status)');
  catFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      catFilterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterCategory = btn.dataset.cat;
      renderTableRows();
    });
  });

  const statusFilterBtns = container.querySelectorAll('.filter-pill-status');
  statusFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      statusFilterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filterStatus = btn.dataset.status;
      renderTableRows();
    });
  });

  addAssignmentBtn.addEventListener('click', () => {
    renderAssignmentFormModal({
      onSave: async (payload) => {
        const { error } = await createAssignment({
          courseId,
          ...payload,
        });
        if (error) return { error };
        await reloadData();
        return { error: null };
      },
    });
  });

  addExamBtn.addEventListener('click', () => {
    renderExamFormModal({
      onSave: async (payload) => {
        const { error } = await createExam({
          courseId,
          ...payload,
        });
        if (error) return { error };
        await reloadData();
        return { error: null };
      },
    });
  });

  function renderWeightsSummary() {
    const exams = rawAssessmentsList.filter((item) => item.category === 'exam');
    const totalWeight = exams.reduce((sum, e) => sum + (Number(e.weight) || 0), 0);
    const isExceeded = totalWeight > 100;

    weightsContainer.innerHTML = `
      <div class="card" style="padding:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;">
          <span><strong>مجموع أوزان الاختبارات:</strong> ${totalWeight}% من 100%</span>
          <span style="font-weight:600;color:${isExceeded ? 'var(--color-danger)' : totalWeight === 100 ? '#10b981' : 'var(--color-accent)'};">
            ${totalWeight === 100 ? '✓ التوزيع مكتمل تماماً' : isExceeded ? '⚠️ تجاوزت نسبة 100%!' : `متبقي ${100 - totalWeight}% غير موزعة`}
          </span>
        </div>
        <div style="width:100%;height:8px;background:var(--color-bg-subtle);border-radius:999px;overflow:hidden;">
          <div style="width:${Math.min(100, totalWeight)}%;height:100%;background:${isExceeded ? 'var(--color-danger)' : 'linear-gradient(90deg, var(--color-primary), var(--color-accent))'};border-radius:999px;transition:width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  async function reloadData() {
    contentArea.innerHTML = skeletons.tableRows(4);

    const { assessments, error } = await fetchCourseAssessments(courseId);

    if (error) {
      contentArea.innerHTML = `
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل الاستحقاقات</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
      return;
    }

    rawAssessmentsList = assessments || [];
    renderWeightsSummary();
    renderTableRows();
    onAssessmentsChange();
  }

  function renderTableRows() {
    let list = rawAssessmentsList;

    if (filterCategory === 'exams') {
      list = list.filter((item) => item.category === 'exam');
    } else if (filterCategory === 'assignments') {
      list = list.filter((item) => item.category === 'assignment');
    }

    if (filterStatus === 'pending') {
      list = list.filter((item) => item.status !== 'completed');
    } else if (filterStatus === 'completed') {
      list = list.filter((item) => item.status === 'completed');
    }

    if (list.length === 0) {
      contentArea.innerHTML = `
        <div class="card empty-state">
          <div class="empty-state-icon" aria-hidden="true">${icons.calendar(32)}</div>
          <h3>لا توجد استحقاقات مطابقة للفلاتر</h3>
          <p>استخدم الأزرار في الأعلى لتسجيل واجب، تكليف، أو موعد امتحان جديد لهذا المساق.</p>
        </div>
      `;
      return;
    }

    contentArea.innerHTML = `
      <div class="card" style="padding:0;overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th style="width:140px;padding-inline-start:var(--space-4);">النوع</th>
              <th>العنوان</th>
              <th style="width:160px;">الموعد النهائي</th>
              <th style="width:120px;">الوزن / المدة</th>
              <th style="width:140px;">الحالة</th>
              <th style="width:90px;text-align:center;padding-inline-end:var(--space-4);">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((item) => renderTableRow(item)).join('')}
          </tbody>
        </table>
      </div>
    `;

    attachRowEvents();
  }

  function renderTableRow(item) {
    let typeBadge = '';
    if (item.type === 'homework') {
      typeBadge = `<span class="badge badge-info">واجب منزلي</span>`;
    } else if (item.type === 'assignment') {
      typeBadge = `<span class="badge badge-accent">تكليف</span>`;
    } else if (item.type === 'project') {
      typeBadge = `<span class="badge badge-success">مشروع</span>`;
    } else if (item.type === 'quiz') {
      typeBadge = `<span class="badge badge-warning">كويز</span>`;
    } else if (item.type === 'midterm') {
      typeBadge = `<span class="badge badge-warning">امتحان نصفي</span>`;
    } else if (item.type === 'final') {
      typeBadge = `<span class="badge badge-danger">امتحان نهائي</span>`;
    } else {
      typeBadge = `<span class="badge">عملي</span>`;
    }

    const dateStr = item.date
      ? `<span class="font-en">${item.date}</span>`
      : '<span class="text-tertiary">غير محدد</span>';

    let countdownBadge = '';
    if (item.diffDays !== null) {
      if (item.diffDays < 0) {
        countdownBadge = `<span class="badge badge-danger">متأخر</span>`;
      } else if (item.diffDays === 0) {
        countdownBadge = `<span class="badge badge-danger">اليوم</span>`;
      } else if (item.diffDays === 1) {
        countdownBadge = `<span class="badge badge-danger">غداً</span>`;
      } else if (item.diffDays <= 3) {
        countdownBadge = `<span class="badge badge-warning">متبقي ${item.diffDays} أيام</span>`;
      } else if (item.diffDays <= 7) {
        countdownBadge = `<span class="badge">متبقي ${item.diffDays} أيام</span>`;
      } else {
        countdownBadge = `<span class="badge">متبقي ${item.diffDays} يوماً</span>`;
      }
    }

    let metaStr = '-';
    if (item.category === 'exam') {
      metaStr = item.weight ? `<strong class="font-en">${item.weight}%</strong> من المادة` : '-';
    } else {
      metaStr = item.estimated_minutes ? `<span class="font-en">${item.estimated_minutes}</span> دقيقة` : '-';
    }

    let statusCell = '';
    if (item.category === 'assignment') {
      statusCell = `
        <select class="input status-select-inline" data-item-id="${item.id}" style="min-height:30px;padding:0 var(--space-2);font-size:12px;width:auto;">
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>قيد الإنجاز</option>
          <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>مكتمل</option>
        </select>
      `;
    } else {
      statusCell =
        item.status === 'completed'
          ? `<span class="badge badge-success">منتهي</span>`
          : `<span class="badge badge-warning">قادم</span>`;
    }

    return `
      <tr data-item-id="${item.id}" data-category="${item.category}">
        <td style="padding-inline-start:var(--space-4);">${typeBadge}</td>
        <td>
          <span style="font-weight:600;color:var(--color-text);">${escapeHtml(item.title)}</span>
          ${item.priority === 'high' ? '<span class="badge badge-danger" style="margin-inline-start:6px;font-size:10px;">عاجل</span>' : ''}
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;">
            <span>${dateStr}</span>
            <div>${countdownBadge}</div>
          </div>
        </td>
        <td><span style="font-size:13px;">${metaStr}</span></td>
        <td>${statusCell}</td>
        <td style="text-align:center;padding-inline-end:var(--space-4);">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <button type="button" class="btn-icon edit-item-btn" data-item-id="${item.id}" title="تعديل" aria-label="تعديل">
              ${icons.edit(14)}
            </button>
            <button type="button" class="btn-icon delete-item-btn" data-item-id="${item.id}" title="حذف" aria-label="حذف" style="color:var(--color-danger);">
              ${icons.trash(14)}
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function attachRowEvents() {
    const statusSelects = contentArea.querySelectorAll('.status-select-inline');
    statusSelects.forEach((select) => {
      select.addEventListener('change', async (e) => {
        const itemId = select.dataset.itemId;
        const newStatus = e.target.value;
        select.disabled = true;

        const { error } = await updateAssignment(itemId, { status: newStatus });
        if (error) {
          select.disabled = false;
        } else {
          await reloadData();
        }
      });
    });

    const editBtns = contentArea.querySelectorAll('.edit-item-btn');
    editBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.itemId;
        const targetItem = rawAssessmentsList.find((x) => x.id === itemId);
        if (!targetItem) return;

        if (targetItem.category === 'assignment') {
          renderAssignmentFormModal({
            initialData: targetItem.raw,
            onSave: async (payload) => {
              const { error } = await updateAssignment(targetItem.id, payload);
              if (error) return { error };
              await reloadData();
              return { error: null };
            },
          });
        } else {
          renderExamFormModal({
            initialData: targetItem.raw,
            onSave: async (payload) => {
              const { error } = await updateExam(targetItem.id, payload);
              if (error) return { error };
              await reloadData();
              return { error: null };
            },
          });
        }
      });
    });

    const deleteBtns = contentArea.querySelectorAll('.delete-item-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.itemId;
        const targetItem = rawAssessmentsList.find((x) => x.id === itemId);
        if (!targetItem) return;

        renderDeleteConfirmModal(targetItem, async () => {
          if (targetItem.category === 'assignment') {
            const { error } = await deleteAssignment(targetItem.id);
            if (error) return { error };
          } else {
            const { error } = await deleteExam(targetItem.id);
            if (error) return { error };
          }
          await reloadData();
          return { error: null };
        });
      });
    });
  }

  function renderDeleteConfirmModal(item, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const typeLabel = item.category === 'exam' ? 'الاختبار' : 'الواجب';

    overlay.innerHTML = `
      <div class="modal-content">
        <h3 style="color:var(--color-danger);">تأكيد حذف ${typeLabel}</h3>
        <p class="modal-description">
          هل أنت متأكد من حذف <strong>"${escapeHtml(item.title)}"</strong>؟
          لن تتمكن من استرجاع هذا السجل بعد الحذف.
        </p>

        <p id="del-modal-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-del-item-btn">إلغاء</button>
          <button type="button" class="btn-danger" id="confirm-del-item-btn">تأكيد الحذف</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#cancel-del-item-btn');
    const confirmBtn = overlay.querySelector('#confirm-del-item-btn');
    const errEl = overlay.querySelector('#del-modal-error');

    function cleanup() {
      if (overlay.parentElement) document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', cleanup);

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'جاري الحذف...';
      const result = await onConfirm();
      if (result?.error) {
        errEl.textContent = result.error.message || 'فشل حذف السجل.';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الحذف';
      } else {
        cleanup();
      }
    });
  }

  reloadData();

  return () => {
    container.innerHTML = '';
  };
}