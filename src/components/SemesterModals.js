// src/components/SemesterModals.js
// مكونات المودال الخاصة بتعديل وحذف الفصول الدراسية مع طبقة حماية للتأكيد

export function renderEditSemesterModal(semester, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>تعديل الفصل الدراسي</h3>
      <form id="edit-semester-form">
        <div>
          <label>اسم الفصل الدراسي</label>
          <input
            type="text"
            name="title"
            value="${semester.title}"
            required
            autocomplete="off"
          />
        </div>

        <div>
          <label>الحالة (Status)</label>
          <select name="status">
            <option value="planned" ${semester.status === 'planned' ? 'selected' : ''}>Planned (مخطط له)</option>
            <option value="in_progress" ${semester.status === 'in_progress' ? 'selected' : ''}>In Progress (قيد الدراسة)</option>
            <option value="completed" ${semester.status === 'completed' ? 'selected' : ''}>Completed (مكتمل)</option>
          </select>
        </div>

        <p id="edit-semester-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-edit-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-edit-btn">حفظ التعديلات</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#edit-semester-form');
  const cancelBtn = overlay.querySelector('#cancel-edit-btn');
  const submitBtn = overlay.querySelector('#save-edit-btn');
  const errorEl = overlay.querySelector('#edit-semester-error');
  const titleInput = overlay.querySelector('input[name="title"]');

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
    submitBtn.textContent = 'جاري الحفظ...';

    const formData = new FormData(form);
    const newTitle = formData.get('title').trim();
    const newStatus = formData.get('status');

    const result = await onSave(semester.id, {
      title: newTitle,
      status: newStatus,
    });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ التعديلات';
      submitBtn.disabled = false;
      submitBtn.textContent = 'حفظ التعديلات';
    } else {
      cleanup();
    }
  });
}

export function renderDeleteSemesterModal(semester, { onDelete, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="border-top: 4px solid #ef4444;">
      <h3 style="color:#ef4444;margin-bottom:0.5rem;">حذف الفصل الدراسي نهائياً</h3>
      <p style="font-size:14px;line-height:1.5;margin-bottom:0.75rem;">
        أنت على وشك حذف <strong>"${semester.title}"</strong>. هذا الإجراء سيؤدي إلى حذف كافة المساقات والمواضيع والبيانات التابعة له فوراً.
      </p>

      <div class="delete-confirm-box">
        لتأكيد الحذف، اكتب اسم الفصل كما هو أدناه:
        <br/>
        <span class="delete-target-badge">${semester.title}</span>
      </div>

      <input
        type="text"
        id="delete-confirm-input"
        placeholder="اكتب اسم الفصل هنا..."
        autocomplete="off"
      />

      <p id="delete-semester-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-btn" disabled>حذف الفصل</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = overlay.querySelector('#delete-confirm-input');
  const confirmBtn = overlay.querySelector('#confirm-delete-btn');
  const cancelBtn = overlay.querySelector('#cancel-delete-btn');
  const errorEl = overlay.querySelector('#delete-semester-error');

  confirmInput.focus();

  confirmInput.addEventListener('input', (e) => {
    confirmBtn.disabled = e.target.value.trim() !== semester.title.trim();
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
    confirmBtn.textContent = 'جاري الحذف...';

    const result = await onDelete(semester.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف الفصل، تأكد من إعدادات قاعدة البيانات';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'حذف الفصل';
    } else {
      cleanup();
    }
  });
}