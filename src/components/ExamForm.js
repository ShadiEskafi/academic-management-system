// src/components/ExamForm.js
// مودال مخصص لإضافة وتعديل الامتحانات والكويزات والاختبارات العملية

export function renderExamFormModal({
  initialData = null,
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 460px;">
      <h3>${isEditing ? 'تعديل اختبار / كويز' : 'إضافة امتحان أو كويز جديد'}</h3>

      <form id="exam-modal-form">
        <div style="margin-bottom:0.85rem;">
          <label style="font-weight:600;display:block;margin-bottom:4px;">عنوان الاختبار *</label>
          <input
            type="text"
            name="title"
            value="${initialData?.title ? escapeHtml(initialData.title) : ''}"
            placeholder="مثال: كويز المصفوفات، امتحان نصفي..."
            required
            autocomplete="off"
          />
        </div>

        <div style="margin-bottom:0.85rem;">
          <label style="font-weight:600;display:block;margin-bottom:4px;">نوع الاختبار</label>
          <select name="examType">
            <option value="quiz" ${initialData?.type === 'quiz' ? 'selected' : ''}>⚡ كويز قصير (Quiz)</option>
            <option value="midterm" ${!initialData || initialData?.type === 'midterm' ? 'selected' : ''}>🏛️ امتحان نصفي (Midterm)</option>
            <option value="final" ${initialData?.type === 'final' ? 'selected' : ''}>🎓 امتحان نهائي (Final)</option>
            <option value="practical" ${initialData?.type === 'practical' ? 'selected' : ''}>🔬 امتحان عملي / شفوي (Practical)</option>
          </select>
        </div>

        <div style="display:flex;gap:0.75rem;margin-bottom:0.85rem;">
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">تاريخ الاختبار</label>
            <input type="date" name="examDate" value="${initialData?.date || ''}" />
          </div>
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">الوزن من العلامة (%)</label>
            <input type="number" name="weight" min="0" max="100" step="0.5" placeholder="مثال: 20" value="${initialData?.weight || ''}" />
          </div>
        </div>

        <p id="exam-modal-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-exam-form-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-exam-form-btn">
            ${isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار'}
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
      saveBtn.textContent = isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار';
      return;
    }

    const payload = {
      title,
      examType: formData.get('examType') || 'midterm',
      examDate: formData.get('examDate') || null,
      weight: formData.get('weight') || null,
    };

    const result = await onSave(payload);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ الاختبار.';
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? 'حفظ التعديلات' : 'إضافة الاختبار';
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