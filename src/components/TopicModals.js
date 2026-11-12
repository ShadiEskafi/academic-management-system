// src/components/TopicModals.js
// مودالات تعديل وحذف مواضيع المساق وفق الـ Design System (Phase D) مع حماية Type-to-Confirm
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';

export function renderEditTopicModal(topic, { onSave, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'edit-topic-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="edit-topic-title">تعديل اسم الموضوع</h3>
      <p class="modal-description">تحديث عنوان الموضوع في شجرة محتوى المساق.</p>

      <form id="edit-topic-form">
        <div class="field">
          <label class="field-label" for="edit-topic-title-input">عنوان الموضوع *</label>
          <input
            id="edit-topic-title-input"
            class="input"
            type="text"
            name="title"
            value="${escapeHtml(topic.title)}"
            required
            autocomplete="off"
          />
        </div>

        <p id="edit-topic-error" class="field-error"></p>

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
  const titleInput = overlay.querySelector('#edit-topic-title-input');

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

    const newTitle = titleInput.value.trim();

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

export function renderDeleteTopicModal(
  topic,
  isParent,
  childCount,
  { onDelete, onClose = () => {} }
) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'delete-topic-title');

  const warningContent = isParent
    ? `
      <div style="display:flex;gap:var(--space-3);padding:var(--space-3);background:var(--color-danger-soft);border:1px solid var(--color-danger);border-radius:var(--radius-sm);margin-bottom:var(--space-4);color:var(--color-danger);">
        <div style="flex-shrink:0;margin-top:2px;">${icons.alertTriangle(18)}</div>
        <div style="font-size:13px;line-height:1.5;">
          هذا الموضوع يمثل فرعاً رئيسياً ويحتوي على <strong>${childCount}</strong> موضوع/مواضيع فرعية.<br/>
          حذفه سيؤدي إلى حذف كامل الشجرة المتفرعة عنه بشكل نهائي.
        </div>
      </div>
    `
    : `
      <p class="modal-description" style="margin-bottom:var(--space-4);">
        هل أنت متأكد من رغبتك في حذف هذا الموضوع؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
      </p>
    `;

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="delete-topic-title" style="color:var(--color-danger);">تأكيد حذف الموضوع</h3>
      
      ${warningContent}

      <div class="field" style="margin-bottom:var(--space-4);">
        <label class="field-label" for="confirm-topic-title-input">
          لتأكيد الحذف، اكتب اسم الموضوع <strong>"${escapeHtml(topic.title)}"</strong> في الحقل أدناه:
        </label>
        <input
          id="confirm-topic-title-input"
          class="input"
          type="text"
          placeholder="اكتب اسم الموضوع هنا للتأكيد"
          autocomplete="off"
        />
      </div>

      <p id="delete-topic-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-topic-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-topic-btn" disabled>تأكيد الحذف</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = overlay.querySelector('#confirm-topic-title-input');
  const confirmBtn = overlay.querySelector('#confirm-delete-topic-btn');
  const cancelBtn = overlay.querySelector('#cancel-delete-topic-btn');
  const errorEl = overlay.querySelector('#delete-topic-error');

  confirmInput.focus();

  // فحص تطابق النص المدخل مع اسم الموضوع لتمكين الزر
  confirmInput.addEventListener('input', () => {
    const isMatch = confirmInput.value.trim() === topic.title.trim();
    confirmBtn.disabled = !isMatch;
  });

  confirmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !confirmBtn.disabled) {
      e.preventDefault();
      confirmBtn.click();
    }
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
    if (confirmInput.value.trim() !== topic.title.trim()) return;

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

export function renderCompleteAllTopicsModal({
  totalTopics,
  onConfirm,
  onClose = () => {},
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'complete-all-topics-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);">
        <div style="color:var(--color-success);display:flex;align-items:center;">
          ${icons.check(22)}
        </div>
        <h3 id="complete-all-topics-title" style="margin:0;">تأكيد إكمال جميع المواضيع</h3>
      </div>
      
      <p class="modal-description" style="margin-bottom:var(--space-4);">
        هل أنت متأكد من رغبتك في تحديد جميع مواضيع هذا المساق (<strong class="font-en" style="font-variant-numeric:tabular-nums;">${totalTopics}</strong> موضوع) كـ "مكتمل"؟
      </p>

      <div style="display:flex;gap:var(--space-3);padding:var(--space-3);background:rgba(56, 189, 248, 0.08);border:1px solid rgba(56, 189, 248, 0.25);border-radius:var(--radius-sm);margin-bottom:var(--space-4);color:var(--color-text);">
        <div style="flex-shrink:0;margin-top:2px;color:var(--color-accent);">${icons.alertTriangle(18)}</div>
        <div style="font-size:13px;line-height:1.5;">
          سيتم تحديث نسبة الإنجاز تلقائياً إلى <strong>100%</strong> وإزالة مؤشر الموضع الحالي من الشجرة، ويمكنك دائماً تغيير حالة أي موضوع لاحقاً بشكل يدوي.
        </div>
      </div>

      <p id="complete-all-topics-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-complete-all-btn">إلغاء</button>
        <button type="button" class="btn-primary" id="confirm-complete-all-btn" style="display:inline-flex;align-items:center;gap:6px;">
          ${icons.check(16)}
          <span>تأكيد الإكمال</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmBtn = overlay.querySelector('#confirm-complete-all-btn');
  const cancelBtn = overlay.querySelector('#cancel-complete-all-btn');
  const errorEl = overlay.querySelector('#complete-all-topics-error');

  confirmBtn.focus();

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
    cancelBtn.disabled = true;
    confirmBtn.innerHTML = `<span>جاري الحفظ...</span>`;

    const result = await onConfirm();

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل تحديث مواضيع المساق';
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.innerHTML = `${icons.check(16)} <span>تأكيد الإكمال</span>`;
    } else {
      cleanup();
    }
  });
}
