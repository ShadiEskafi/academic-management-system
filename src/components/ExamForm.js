// src/components/ExamForm.js
// مودال إضافة وتعديل الاختبارات والكويزات وفق الـ Design System (Phase E)
import { icons } from '../utils/icons.js';

export function renderExamFormModal({
  initialData = null,
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'exam-modal-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="exam-modal-title">${isEditing ? 'تعديل اختبار / كويز' : 'إضافة امتحان أو كويز جديد'}</h3>
      <p class="modal-description">تحديد نوع الاختبار ووزنه الأكاديمي لحساب ضغط الدراسة وتوزيع الساعات.</p>

      <form id="exam-modal-form">
        <div class="field">
          <label class="field-label" for="exam-title">عنوان الاختبار *</label>
          <input
            id="exam-title"
            class="input"
            type="text"
            name="title"
            value="${initialData?.title ? escapeHtml(initialData.title) : ''}"
            placeholder="مثال: الاختبار النصفي، كويز المصفوفات"
            required
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label class="field-label" for="exam-type">نوع الاختبار</label>
          <select id="exam-type" class="input" name="examType">
            <option value="quiz" ${initialData?.type === 'quiz' ? 'selected' : ''}>كويز قصير (Quiz)</option>
            <option value="midterm" ${!initialData || initialData?.type === 'midterm' ? 'selected' : ''}>امتحان نصفي (Midterm)</option>
            <option value="final" ${initialData?.type === 'final' ? 'selected' : ''}>امتحان نهائي (Final)</option>
            <option value="practical" ${initialData?.type === 'practical' ? 'selected' : ''}>امتحان عملي / شفوي (Practical)</option>
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="field">
            <label class="field-label" for="exam-date">تاريخ الاختبار</label>
            <input id="exam-date" class="input font-en" type="date" name="examDate" value="${initialData?.date || ''}" />
          </div>
          <div class="field">
            <label class="field-label" for="exam-weight">الوزن من العلامة (%)</label>
            <input id="exam-weight" class="input font-en" type="number" name="weight" min="0" max="100" step="0.5" placeholder="مثال: 20" value="${initialData?.weight || ''}" />
          </div>
        </div>

        <p id="exam-modal-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-exam-form-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-exam-form-btn">
            ${isEditing ? icons.check(15) : icons.plus(15)}
            <span>${isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#exam-modal-form');
  const cancelBtn = overlay.querySelector('#cancel-exam-form-btn');
  const saveBtn = overlay.querySelector('#save-exam-form-btn');
  const errorEl = overlay.querySelector('#exam-modal-error');
  const titleInput = overlay.querySelector('#exam-title');

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
      errorEl.textContent = 'عنوان الاختبار مطلوب.';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار'}</span>`;
      return;
    }

    const payload = {
      title,
      examType: formData.get('examType') || 'midterm',
      examDate: formData.get('examDate') || null,
      weight: formData.get('weight') ? Number(formData.get('weight')) : null,
    };

    const result = await onSave(payload);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ الاختبار.';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار'}</span>`;
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