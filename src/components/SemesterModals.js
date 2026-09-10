// src/components/SemesterModals.js
// مودالات تعديل وحذف الفصل الدراسي متوافقة مع قيود قاعدة البيانات chk_semester_status
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';

/**
 * مودال تعديل الفصل الدراسي
 */
export function renderEditSemesterModal(semester, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'edit-semester-title');

  // مطابقة الحالة الحالية مع قيم قاعدة البيانات الصحيحة
  const isCurrentActive = semester.status === 'active' || semester.status === 'in_progress';
  const isCurrentPlanned = semester.status === 'planned';
  const isCurrentCompleted = semester.status === 'completed';

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="edit-semester-title">تعديل الفصل الدراسي</h3>
      <p class="modal-description">قم بتحديث بيانات الفصل الدراسي وحالته الأكاديمية.</p>

      <form id="edit-semester-form">
        <div class="field">
          <label class="field-label" for="edit-semester-name">اسم الفصل الدراسي *</label>
          <input
            id="edit-semester-name"
            name="title"
            class="input"
            type="text"
            required
            value="${escapeHtml(semester.title || '')}"
            placeholder="مثال: الفصل الدراسي الأول 2026/2027"
          />
        </div>

        <div class="field">
          <label class="field-label" for="edit-semester-status">الحالة الأكاديمية</label>
          <select id="edit-semester-status" name="status" class="input">
            <option value="active" ${isCurrentActive ? 'selected' : ''}>فصل حالي نشط</option>
            <option value="planned" ${isCurrentPlanned ? 'selected' : ''}>مخطط له / قادم</option>
            <option value="completed" ${isCurrentCompleted ? 'selected' : ''}>مكتمل</option>
          </select>
        </div>

        <p id="edit-semester-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-edit-semester-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-edit-semester-btn">
            <span>حفظ التعديلات</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#edit-semester-form');
  const cancelBtn = overlay.querySelector('#cancel-edit-semester-btn');
  const saveBtn = overlay.querySelector('#save-edit-semester-btn');
  const errorEl = overlay.querySelector('#edit-semester-error');

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.classList.add('btn-loading');

    const formData = new FormData(form);
    const newTitle = formData.get('title').trim();
    const newStatus = formData.get('status');

    if (!newTitle) {
      errorEl.textContent = 'اسم الفصل الدراسي مطلوب.';
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-loading');
      return;
    }

    const result = await onSave(semester.id, {
      title: newTitle,
      status: newStatus,
    });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ التعديلات، يرجى المحاولة لاحقاً.';
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}

/**
 * مودال حذف الفصل الدراسي
 */
export function renderDeleteSemesterModal(semester, { onDelete, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'delete-semester-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="delete-semester-title" style="color:var(--color-danger);">تأكيد حذف الفصل الدراسي</h3>
      <p class="modal-description">
        هل أنت متأكد من رغبتك في حذف <strong>${escapeHtml(semester.title)}</strong>؟
        <br />
        <span style="color:var(--color-danger);font-size:13px;">تنبيه: سيتم حذف جميع المساقات والمواضيع المرتبطة بهذا الفصل نهائياً.</span>
      </p>

      <p id="delete-semester-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-semester-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-semester-btn">
          ${icons.trash(15)}
          <span>حذف الفصل نهائياً</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cancelBtn = overlay.querySelector('#cancel-delete-semester-btn');
  const confirmBtn = overlay.querySelector('#confirm-delete-semester-btn');
  const errorEl = overlay.querySelector('#delete-semester-error');

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  confirmBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    confirmBtn.disabled = true;
    confirmBtn.classList.add('btn-loading');

    const result = await onDelete(semester.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف الفصل، تأكد من الصلاحيات.';
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}