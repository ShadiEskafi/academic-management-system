// src/components/AssignmentForm.js
// مودال إضافة وتعديل الواجبات والتكليفات وفق الـ Design System (Phase E)
import { icons } from '../utils/icons.js';

export function renderAssignmentFormModal({
  initialData = null,
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'assignment-modal-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="assignment-modal-title">${isEditing ? 'تعديل واجب / تكليف' : 'إضافة واجب أو تكليف جديد'}</h3>
      <p class="modal-description">تحديد تفاصيل المهمة الدراسية وتاريخ تسليمها لجدولة أولوياتها تلقائياً.</p>

      <form id="assignment-modal-form">
        <div class="field">
          <label class="field-label" for="assignment-title">العنوان *</label>
          <input
            id="assignment-title"
            class="input"
            type="text"
            name="title"
            value="${initialData?.title ? escapeHtml(initialData.title) : ''}"
            placeholder="مثال: حل مسائل المصفوفات ص 45"
            required
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label class="field-label" for="assignment-type">نوع المهمة</label>
          <select id="assignment-type" class="input" name="type">
            <option value="homework" ${initialData?.type === 'homework' ? 'selected' : ''}>واجب منزلي (Homework)</option>
            <option value="assignment" ${!initialData || initialData?.type === 'assignment' ? 'selected' : ''}>تكليف أسبوعي (Assignment)</option>
            <option value="project" ${initialData?.type === 'project' ? 'selected' : ''}>مشروع فصلي (Project)</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="field">
            <label class="field-label" for="assignment-due-date">تاريخ الاستحقاق</label>
            <input id="assignment-due-date" class="input font-en" type="date" name="dueDate" value="${initialData?.date || ''}" />
          </div>
          <div class="field">
            <label class="field-label" for="assignment-minutes">الوقت التقديري (بالدقائق)</label>
            <input id="assignment-minutes" class="input font-en" type="number" name="estimatedMinutes" min="0" placeholder="مثال: 60" value="${initialData?.estimated_minutes || ''}" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="field">
            <label class="field-label" for="assignment-priority">الأولوية</label>
            <select id="assignment-priority" class="input" name="priority">
              <option value="low" ${initialData?.priority === 'low' ? 'selected' : ''}>منخفضة (Low)</option>
              <option value="medium" ${!initialData || initialData?.priority === 'medium' ? 'selected' : ''}>متوسطة (Medium)</option>
              <option value="high" ${initialData?.priority === 'high' ? 'selected' : ''}>عالية (High)</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="assignment-status">الحالة</label>
            <select id="assignment-status" class="input" name="status">
              <option value="pending" ${!initialData || initialData?.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
              <option value="in_progress" ${initialData?.status === 'in_progress' ? 'selected' : ''}>قيد الإنجاز</option>
              <option value="completed" ${initialData?.status === 'completed' ? 'selected' : ''}>مكتمل ومسلّم</option>
            </select>
          </div>
        </div>

        <p id="assignment-modal-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-assignment-form-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-assignment-form-btn">
            ${isEditing ? icons.check(15) : icons.plus(15)}
            <span>${isEditing ? 'حفظ التعديلات' : 'إضافة الواجب'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#assignment-modal-form');
  const cancelBtn = overlay.querySelector('#cancel-assignment-form-btn');
  const saveBtn = overlay.querySelector('#save-assignment-form-btn');
  const errorEl = overlay.querySelector('#assignment-modal-error');
  const titleInput = overlay.querySelector('#assignment-title');

  titleInput.focus();

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
    saveBtn.textContent = 'جاري الحفظ...';

    const formData = new FormData(form);
    const title = formData.get('title')?.trim();

    if (!title) {
      errorEl.textContent = 'عنوان الواجب مطلوب.';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${isEditing ? 'حفظ التعديلات' : 'إضافة الواجب'}</span>`;
      return;
    }

    const payload = {
      title,
      type: formData.get('type') || 'assignment',
      dueDate: formData.get('dueDate') || null,
      estimatedMinutes: formData.get('estimatedMinutes') ? Number(formData.get('estimatedMinutes')) : null,
      priority: formData.get('priority') || 'medium',
      status: formData.get('status') || 'pending',
    };

    const result = await onSave(payload);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ الواجب.';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${isEditing ? 'حفظ التعديلات' : 'إضافة الواجب'}</span>`;
    } else {
      cleanup();
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}