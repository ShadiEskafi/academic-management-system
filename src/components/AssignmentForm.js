// src/components/AssignmentForm.js
// مودال مخصص لإضافة وتعديل الواجبات المنزلية، التكليفات، والمشاريع

export function renderAssignmentFormModal({
  initialData = null,
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');

  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 460px;">
      <h3>${isEditing ? 'تعديل واجب / تكليف' : 'إضافة واجب أو تكليف جديد'}</h3>

      <form id="assignment-modal-form">
        <div style="margin-bottom:0.85rem;">
          <label style="font-weight:600;display:block;margin-bottom:4px;">
            العنوان *
          </label>

          <input
            type="text"
            name="title"
            value="${initialData?.title ? escapeHtml(initialData.title) : ''}"
            placeholder="مثال: حل تمارين المصفوفات ص 45"
            required
            autocomplete="off"
          />
        </div>

        <div style="margin-bottom:0.85rem;">
          <label style="font-weight:600;display:block;margin-bottom:4px;">
            نوع المهمة
          </label>

          <select name="type">
            <option
              value="homework"
              ${initialData?.type === 'homework' ? 'selected' : ''}
            >
              📝 واجب منزلي (Homework)
            </option>

            <option
              value="assignment"
              ${!initialData || initialData?.type === 'assignment' ? 'selected' : ''}
            >
              💼 تكليف أسبوعي (Assignment)
            </option>

            <option
              value="project"
              ${initialData?.type === 'project' ? 'selected' : ''}
            >
              🚀 مشروع فصلي (Project)
            </option>
          </select>
        </div>

        <div style="display:flex;gap:0.75rem;margin-bottom:0.85rem;">
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">
              تاريخ الاستحقاق
            </label>

            <input
              type="date"
              name="dueDate"
              value="${initialData?.date || ''}"
            />
          </div>

          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">
              الوقت التقديري (دقيقة)
            </label>

            <input
              type="number"
              name="estimatedMinutes"
              min="0"
              placeholder="مثال: 60"
              value="${initialData?.estimated_minutes || ''}"
            />
          </div>
        </div>

        <div style="display:flex;gap:0.75rem;margin-bottom:0.85rem;">
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">
              الأولوية
            </label>

            <select name="priority">
              <option
                value="low"
                ${initialData?.priority === 'low' ? 'selected' : ''}
              >
                منخفضة (Low)
              </option>

              <option
                value="medium"
                ${!initialData || initialData?.priority === 'medium' ? 'selected' : ''}
              >
                متوسطة (Medium)
              </option>

              <option
                value="high"
                ${initialData?.priority === 'high' ? 'selected' : ''}
              >
                عالية (High)
              </option>
            </select>
          </div>

          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:4px;">
              الحالة
            </label>

            <select name="status">
              <option
                value="pending"
                ${!initialData || initialData?.status === 'pending' ? 'selected' : ''}
              >
                قيد الانتظار
              </option>

              <option
                value="in_progress"
                ${initialData?.status === 'in_progress' ? 'selected' : ''}
              >
                قيد الحل
              </option>

              <option
                value="completed"
                ${initialData?.status === 'completed' ? 'selected' : ''}
              >
                مكتمل ومسلّم
              </option>
            </select>
          </div>
        </div>

        <p
          id="assignment-modal-error"
          style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"
        ></p>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-secondary"
            id="cancel-assignment-form-btn"
          >
            إلغاء
          </button>

          <button
            type="submit"
            class="btn-primary"
            id="save-assignment-form-btn"
          >
            ${isEditing ? 'حفظ التعديلات' : 'إضافة الواجب'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#assignment-modal-form');
  const cancelBtn = overlay.querySelector(
    '#cancel-assignment-form-btn'
  );
  const saveBtn = overlay.querySelector(
    '#save-assignment-form-btn'
  );
  const errorEl = overlay.querySelector(
    '#assignment-modal-error'
  );

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);

    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }

    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
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
      errorEl.textContent = 'عنوان الواجب مطلوب.';

      saveBtn.disabled = false;
      saveBtn.textContent = isEditing
        ? 'حفظ التعديلات'
        : 'إضافة الواجب';

      return;
    }

    const payload = {
      title,
      type: formData.get('type') || 'assignment',
      dueDate: formData.get('dueDate') || null,
      estimatedMinutes:
        formData.get('estimatedMinutes') || null,
      priority: formData.get('priority') || 'medium',
      status: formData.get('status') || 'pending',
    };

    const result = await onSave(payload);

    if (result?.error) {
      errorEl.textContent =
        result.error.message || 'فشل حفظ الواجب.';

      saveBtn.disabled = false;
      saveBtn.textContent = isEditing
        ? 'حفظ التعديلات'
        : 'إضافة الواجب';

      return;
    }

    cleanup();
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