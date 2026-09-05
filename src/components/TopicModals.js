// src/components/TopicModals.js
// مكونات المودال المخصصة لتعديل اسم الموضوع وتأكيد الحذف التتابعي للشجرة

export function renderEditTopicModal(topic, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>تعديل اسم الموضوع (Topic)</h3>
      <form id="edit-topic-form">
        <div>
          <label>عنوان الموضوع *</label>
          <input
            type="text"
            name="title"
            value="${topic.title}"
            required
            autocomplete="off"
          />
        </div>

        <p id="edit-topic-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-edit-topic-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-edit-topic-btn">حفظ التعديل</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#edit-topic-form');
  const cancelBtn = overlay.querySelector('#cancel-edit-topic-btn');
  const submitBtn = overlay.querySelector('#save-edit-topic-btn');
  const errorEl = overlay.querySelector('#edit-topic-error');
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

    if (!newTitle) {
      errorEl.textContent = 'عنوان الموضوع مطلوب.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'حفظ التعديل';
      return;
    }

    const result = await onSave(topic.id, { title: newTitle });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ تعديل الموضوع';
      submitBtn.disabled = false;
      submitBtn.textContent = 'حفظ التعديل';
    } else {
      cleanup();
    }
  });
}

export function renderDeleteTopicModal(topic, isParent, childCount, { onDelete, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const warningContent = isParent
    ? `
      <p style="font-size:14px;line-height:1.5;margin-bottom:0.75rem;color:#f87171;">
        ⚠️ هذا الموضوع هو أب ويحتوي على <strong>${childCount}</strong> موضوع/مواضيع فرعية.<br/>
        حذفه سيؤدي إلى حذف كامل الشجرة المتفرعة عنه ولا يمكن التراجع عن هذه الخطوة.
      </p>
    `
    : `
      <p style="font-size:14px;line-height:1.5;margin-bottom:0.75rem;">
        هل أنت متأكد من حذف الموضوع <strong>"${topic.title}"</strong>؟
      </p>
    `;

  overlay.innerHTML = `
    <div class="modal-content" style="border-top: 4px solid #ef4444;">
      <h3 style="color:#ef4444;margin-bottom:0.5rem;">تأكيد حذف الموضوع</h3>
      
      ${warningContent}

      <p id="delete-topic-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-topic-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-topic-btn">تأكيد الحذف</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmBtn = overlay.querySelector('#confirm-delete-topic-btn');
  const cancelBtn = overlay.querySelector('#cancel-delete-topic-btn');
  const errorEl = overlay.querySelector('#delete-topic-error');

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

    const result = await onDelete(topic.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف الموضوع';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'تأكيد الحذف';
    } else {
      cleanup();
    }
  });
}