// src/components/CourseModals.js
// مودالات تعديل وحذف المساقات وفق الـ Design System (Phase D)
import { icons } from '../utils/icons.js';

import { escapeHtml } from '../utils/sanitize.js';

export function renderEditCourseModal(course, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="edit-course-title">
      <h3 id="edit-course-title">تعديل بيانات المساق</h3>
      <p class="modal-description">تحديث معلومات المساق، الساعات المعتمدة ومستوى الصعوبة.</p>

      <form id="edit-course-form">
        <div class="field">
          <label class="field-label" for="edit-course-title-input">اسم المساق</label>
          <input
            id="edit-course-title-input"
            class="input"
            type="text"
            name="title"
            value="${escapeHtml(course.title)}"
            required
            autocomplete="off"
          />
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="field">
            <label class="field-label" for="edit-credit-hours">الساعات المعتمدة *</label>
            <input
              id="edit-credit-hours"
              class="input font-en"
              type="number"
              name="creditHours"
              value="${course.credit_hours}"
              min="1"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="edit-difficulty">مستوى الصعوبة *</label>
            <select id="edit-difficulty" class="input" name="difficulty" required>
              <option value="easy" ${course.difficulty === 'easy' ? 'selected' : ''}>سهل</option>
              <option value="medium" ${course.difficulty === 'medium' ? 'selected' : ''}>متوسط</option>
              <option value="hard" ${course.difficulty === 'hard' ? 'selected' : ''}>صعب</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="edit-priority">الأولوية التقديرية</label>
          <select id="edit-priority" class="input" name="priority">
            <option value="low" ${course.priority === 'low' ? 'selected' : ''}>منخفضة</option>
            <option value="medium" ${course.priority === 'medium' ? 'selected' : ''}>متوسطة</option>
            <option value="high" ${course.priority === 'high' ? 'selected' : ''}>مرتفعة</option>
          </select>
        </div>

        <p id="edit-course-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-edit-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-edit-btn">حفظ التعديلات</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#edit-course-form');
  const cancelBtn = overlay.querySelector('#cancel-edit-btn');
  const submitBtn = overlay.querySelector('#save-edit-btn');
  const errorEl = overlay.querySelector('#edit-course-error');
  const titleInput = overlay.querySelector('#edit-course-title-input');

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
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');

    const formData = new FormData(form);
    const updates = {
      title: formData.get('title').trim(),
      creditHours: Number(formData.get('creditHours')),
      difficulty: formData.get('difficulty'),
      priority: formData.get('priority'),
    };

    const result = await onSave(course.id, updates);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ التعديلات';
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}

export function renderDeleteCourseModal(course, { onDelete, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="delete-course-title">
      <h3 id="delete-course-title" style="color:var(--color-danger);">حذف المساق نهائياً</h3>
      <p class="modal-description">
        أنت على وشك حذف <strong>"${escapeHtml(course.title)}"</strong>. هذا الإجراء سيؤدي إلى حذف شجرة المواضيع وسجلات الإنجاز وجلسات المذاكرة التابعة له.
      </p>

      <div class="field" style="margin-block:var(--space-4);">
        <label class="field-label" for="delete-course-confirm-input">لتأكيد الحذف، اكتب اسم المساق تماماً كما هو:</label>
        <div style="padding:var(--space-2) var(--space-3);background:var(--color-surface-muted);border:1px solid var(--color-border);border-radius:var(--radius-sm);font-weight:600;font-size:13px;margin-bottom:var(--space-2);color:var(--color-text);">
          ${escapeHtml(course.title)}
        </div>
        <input
          type="text"
          id="delete-course-confirm-input"
          class="input"
          placeholder="اكتب اسم المساق هنا للتأكيد..."
          autocomplete="off"
        />
      </div>

      <p id="delete-course-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-course-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-course-btn" disabled>حذف المساق</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = overlay.querySelector('#delete-course-confirm-input');
  const confirmBtn = overlay.querySelector('#confirm-delete-course-btn');
  const cancelBtn = overlay.querySelector('#cancel-delete-course-btn');
  const errorEl = overlay.querySelector('#delete-course-error');

  confirmInput.focus();

  confirmInput.addEventListener('input', (e) => {
    confirmBtn.disabled = e.target.value.trim() !== course.title.trim();
  });

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

    const result = await onDelete(course.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف المساق';
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}
