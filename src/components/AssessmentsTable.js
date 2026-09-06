// src/components/AssessmentsTable.js
// الجدول الموحد للاستحقاقات مع شريط الفلترة وأزرار الإضافة السريعة ومودال تأكيد الحذف

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

export function renderAssessmentsView(container, { courseId }) {
  let filterCategory = 'all'; // all | exams | assignments
  let filterStatus = 'all';   // all | pending | completed
  let rawAssessmentsList = [];

  container.innerHTML = `
    <div class="assessments-header-row">
      <div class="assessments-filter-bar">
        <button type="button" class="filter-pill active" data-cat="all">الكل</button>
        <button type="button" class="filter-pill" data-cat="exams">⚡ امتحانات وكويزات</button>
        <button type="button" class="filter-pill" data-cat="assignments">📝 واجبات وتكليفات</button>
        
        <span style="color:var(--border);margin:0 4px;">|</span>
        
        <button type="button" class="filter-pill-status active" data-status="all">كافة الحالات</button>
        <button type="button" class="filter-pill-status" data-status="pending">قيد الانتظار / قادمة</button>
        <button type="button" class="filter-pill-status" data-status="completed">منجزة / مكتملة</button>
      </div>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button
          type="button"
          id="btn-add-homework"
          class="btn-secondary"
          style="font-size:13px;padding:0.45rem 0.85rem;"
        >
          + إضافة واجب 📝
        </button>
        <button
          type="button"
          id="btn-add-exam"
          class="btn-primary"
          style="font-size:13px;padding:0.45rem 0.85rem;"
        >
          + إضافة امتحان ⚡
        </button>
      </div>
    </div>

    <div id="assessments-content-area">
      <p style="color:var(--text);font-size:14px;">جاري تحميل الاستحقاقات والامتحانات...</p>
    </div>
  `;

  const contentArea = container.querySelector('#assessments-content-area');
  const addAssignmentBtn = container.querySelector('#btn-add-homework');
  const addExamBtn = container.querySelector('#btn-add-exam');

  const catFilterBtns = container.querySelectorAll('.filter-pill');
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

  async function reloadData() {
    contentArea.innerHTML = `
      <p style="color:var(--text);font-size:14px;">جاري تحميل الاستحقاقات والامتحانات...</p>
    `;

    const { assessments, error } = await fetchCourseAssessments(courseId);

    if (error) {
      contentArea.innerHTML = `
        <p style="color:#ef4444;font-size:14px;">فشل تحميل الاستحقاقات: ${escapeHtml(error.message)}</p>
      `;
      return;
    }

    rawAssessmentsList = assessments || [];
    renderTableRows();
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
        <div class="empty-assessments-box">
          <p style="margin:0 0 0.5rem;font-size:15px;color:var(--text-h);font-weight:500;">
            لا توجد استحقاقات مطابقة للفلاتر المحددة.
          </p>
          <span style="font-size:13px;color:var(--text);">
            استخدم الأزرار في الأعلى لإضافة واجب منزلي، تكليف، أو امتحان لهذا المساق.
          </span>
        </div>
      `;
      return;
    }

    contentArea.innerHTML = `
      <div class="assessment-table-wrapper">
        <table class="assessment-table">
          <thead>
            <tr>
              <th style="width:130px;">النوع</th>
              <th>العنوان</th>
              <th style="width:160px;">الموعد النهائي</th>
              <th style="width:120px;">الوزن / المدة</th>
              <th style="width:130px;">الحالة</th>
              <th style="width:90px;text-align:center;">إجراءات</th>
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
      typeBadge = `<span class="badge-type badge-homework">📝 واجب منزلي</span>`;
    } else if (item.type === 'assignment') {
      typeBadge = `<span class="badge-type badge-assignment">💼 تكليف</span>`;
    } else if (item.type === 'project') {
      typeBadge = `<span class="badge-type badge-project">🚀 مشروع</span>`;
    } else if (item.type === 'quiz') {
      typeBadge = `<span class="badge-type badge-quiz">⚡ كويز</span>`;
    } else if (item.type === 'midterm') {
      typeBadge = `<span class="badge-type badge-exam">🏛️ نصفي</span>`;
    } else if (item.type === 'final') {
      typeBadge = `<span class="badge-type badge-exam-final">🎓 نهائي</span>`;
    } else {
      typeBadge = `<span class="badge-type badge-practical">🔬 عملي</span>`;
    }

    let dateStr = item.date ? item.date : '<span style="color:var(--text);">غير محدد</span>';
    let countdownBadge = '';

    if (item.diffDays !== null) {
      if (item.diffDays < 0) {
        countdownBadge = `<span class="badge-countdown badge-passed">منتهي</span>`;
      } else if (item.diffDays === 0) {
        countdownBadge = `<span class="badge-countdown badge-urgent">اليوم ⚠️</span>`;
      } else if (item.diffDays === 1) {
        countdownBadge = `<span class="badge-countdown badge-urgent">غداً ⚠️</span>`;
      } else if (item.diffDays <= 3) {
        countdownBadge = `<span class="badge-countdown badge-urgent">متبقي ${item.diffDays} أيام</span>`;
      } else if (item.diffDays <= 7) {
        countdownBadge = `<span class="badge-countdown badge-soon">متبقي ${item.diffDays} أيام</span>`;
      } else {
        countdownBadge = `<span class="badge-countdown badge-normal">متبقي ${item.diffDays} يوماً</span>`;
      }
    }

    let metaStr = '-';
    if (item.category === 'exam') {
      metaStr = item.weight ? `<strong>${item.weight}%</strong> من المادة` : '-';
    } else {
      metaStr = item.estimated_minutes ? `${item.estimated_minutes} دقيقة` : '-';
    }

    let statusCell = '';
    if (item.category === 'assignment') {
      statusCell = `
        <select class="status-select-inline" data-item-id="${item.id}">
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>قيد الحل</option>
          <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>مكتمل ✓</option>
        </select>
      `;
    } else {
      statusCell =
        item.status === 'completed'
          ? `<span style="color:#10b981;font-size:12px;font-weight:600;">منتهي ✓</span>`
          : `<span style="color:#f59e0b;font-size:12px;font-weight:600;">قادم ⏳</span>`;
    }

    return `
      <tr data-item-id="${item.id}" data-category="${item.category}">
        <td>${typeBadge}</td>
        <td>
          <span style="font-weight:600;color:var(--text-h);">${escapeHtml(item.title)}</span>
          ${item.priority === 'high' ? '<span class="badge-priority-high" title="أولوية عالية">عاجل</span>' : ''}
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <span>${dateStr}</span>
            <div>${countdownBadge}</div>
          </div>
        </td>
        <td><span style="font-size:13px;">${metaStr}</span></td>
        <td>${statusCell}</td>
        <td style="text-align:center;">
          <button type="button" class="action-btn edit-item-btn" data-item-id="${item.id}" title="تعديل">✏️</button>
          <button type="button" class="action-btn delete-item-btn" data-item-id="${item.id}" title="حذف" style="color:#ef4444;">🗑️</button>
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
            initialData: targetItem,
            onSave: async (payload) => {
              const { error } = await updateAssignment(targetItem.id, payload);
              if (error) return { error };
              await reloadData();
              return { error: null };
            },
          });
        } else {
          renderExamFormModal({
            initialData: targetItem,
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
    const typeLabel = item.category === 'exam' ? 'الاختبار' : 'الواجب';

    overlay.innerHTML = `
      <div class="modal-content" style="border-top: 4px solid #ef4444;">
        <h3 style="color:#ef4444;margin-bottom:0.5rem;">تأكيد حذف ${typeLabel}</h3>
        <p style="font-size:14px;line-height:1.5;margin-bottom:1rem;">
          هل أنت متأكد من حذف <strong>"${escapeHtml(item.title)}"</strong>؟
          <br/>
          لن تتمكن من استرجاع هذا السجل بعد الحذف.
        </p>

        <p id="del-modal-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}