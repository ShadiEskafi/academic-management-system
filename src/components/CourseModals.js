// src/components/CourseModals.js
// مكونات المودال الخاصة بتعديل وحذف المساقات مع طبقة حماية التأكيد بالاسم

export function renderEditCourseModal(course, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>تعديل بيانات المساق</h3>
      <form id="edit-course-form">
        <div>
          <label>اسم المساق</label>
          <input
            type="text"
            name="title"
            value="${course.title}"
            required
            autocomplete="off"
          />
        </div>

        <div style="display:flex;gap:0.5rem;">
          <div style="flex:1;">
            <label>الساعات المعتمدة (CH) *</label>
            <input
              type="number"
              name="creditHours"
              value="${course.credit_hours}"
              min="1"
              required
            />
          </div>

          <div style="flex:1;">
            <label>مستوى الصعوبة *</label>
            <select name="difficulty" required>
              <option value="easy" ${course.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${course.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${course.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label>الأولوية (Priority)</label>
          <select name="priority">
            <option value="low" ${course.priority === 'low' ? 'selected' : ''}>Priority: Low</option>
            <option value="medium" ${course.priority === 'medium' ? 'selected' : ''}>Priority: Medium</option>
            <option value="high" ${course.priority === 'high' ? 'selected' : ''}>Priority: High</option>
          </select>
        </div>

        <p id="edit-course-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

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
      submitBtn.textContent = 'حفظ التعديلات';
    } else {
      cleanup();
    }
  });
}

export function renderDeleteCourseModal(course, { onDelete, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="border-top: 4px solid #ef4444;">
      <h3 style="color:#ef4444;margin-bottom:0.5rem;">حذف المساق نهائياً</h3>
      <p style="font-size:14px;line-height:1.5;margin-bottom:0.75rem;">
        أنت على وشك حذف المساق <strong>"${course.title}"</strong>. هذا الإجراء سيؤدي إلى حذف شجرة المواضيع (Topics) وسجلات الإنجاز المرتبطة به نهائياً.
      </p>

      <div class="delete-confirm-box">
        لتأكيد الحذف، اكتب اسم المساق كما هو أدناه:
        <br/>
        <span class="delete-target-badge">${course.title}</span>
      </div>

      <input
        type="text"
        id="delete-course-confirm-input"
        placeholder="اكتب اسم المساق هنا..."
        autocomplete="off"
      />

      <p id="delete-course-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

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
    confirmBtn.textContent = 'جاري الحذف...';

    const result = await onDelete(course.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف المساق';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'حذف المساق';
    } else {
      cleanup();
    }
  });
}