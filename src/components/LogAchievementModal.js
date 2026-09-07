// src/components/LogAchievementModal.js
// مودال تسجيل إنجاز دراسي سريع وفق الـ Design System (Phase D)
import { icons } from '../utils/icons.js';

export function renderLogAchievementModal({ existingTopics = [], onSubmit, onClose = () => {} }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'log-achievement-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="log-achievement-title">سجّل إنجاز جديد</h3>
      <p class="modal-description">سجّل إتمام موضوع دراسي لتحديث موضع تقدمك الأكاديمي تلقائياً.</p>

      <div style="display:flex;background:var(--color-surface-muted);padding:3px;border-radius:var(--radius-sm);margin-bottom:var(--space-4);border:1px solid var(--color-border);">
        <button
          type="button"
          id="mode-existing"
          class="btn-tertiary"
          style="flex:1;min-height:34px;font-size:13px;border-radius:var(--radius-sm);font-weight:500;"
        >
          من قائمة المواضيع
        </button>
        <button
          type="button"
          id="mode-new"
          class="btn-tertiary"
          style="flex:1;min-height:34px;font-size:13px;border-radius:var(--radius-sm);font-weight:500;"
        >
          موضوع جديد
        </button>
      </div>

      <div id="modal-body" class="field"></div>

      <p id="modal-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="modal-cancel">إلغاء</button>
        <button type="submit" class="btn-primary" id="modal-save">
          ${icons.check(16)}
          <span>تأكيد الإنجاز</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let mode = existingTopics.length > 0 ? 'existing' : 'new';
  const modalBody = overlay.querySelector('#modal-body');
  const errorEl = overlay.querySelector('#modal-error');
  const saveBtn = overlay.querySelector('#modal-save');
  const modeExistingBtn = overlay.querySelector('#mode-existing');
  const modeNewBtn = overlay.querySelector('#mode-new');

  function updateModeButtons() {
    if (mode === 'existing') {
      modeExistingBtn.style.background = 'var(--color-surface)';
      modeExistingBtn.style.color = 'var(--color-text)';
      modeExistingBtn.style.boxShadow = 'var(--shadow-xs)';
      modeExistingBtn.style.fontWeight = '600';

      modeNewBtn.style.background = 'transparent';
      modeNewBtn.style.color = 'var(--color-text-secondary)';
      modeNewBtn.style.boxShadow = 'none';
      modeNewBtn.style.fontWeight = '500';
    } else {
      modeNewBtn.style.background = 'var(--color-surface)';
      modeNewBtn.style.color = 'var(--color-text)';
      modeNewBtn.style.boxShadow = 'var(--shadow-xs)';
      modeNewBtn.style.fontWeight = '600';

      modeExistingBtn.style.background = 'transparent';
      modeExistingBtn.style.color = 'var(--color-text-secondary)';
      modeExistingBtn.style.boxShadow = 'none';
      modeExistingBtn.style.fontWeight = '500';
    }
  }

  function renderBody() {
    updateModeButtons();
    if (mode === 'new') {
      modalBody.innerHTML = `
        <label class="field-label" for="new-topic-title">اسم الموضوع المنجز *</label>
        <input
          type="text"
          id="new-topic-title"
          class="input"
          placeholder="أدخل عنوان الموضوع الذي أنهيته..."
          autocomplete="off"
        />
      `;
      const input = modalBody.querySelector('#new-topic-title');
      if (input) input.focus();
    } else if (existingTopics.length === 0) {
      modalBody.innerHTML = `
        <div class="card" style="background:var(--color-surface-soft);padding:var(--space-3);text-align:center;">
          <p class="text-secondary" style="font-size:13px;">لا توجد مواضيع غير مكتملة حالياً في هذا المساق — يمكنك إضافة موضوع جديد مباشرة.</p>
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <label class="field-label" for="existing-topic-select">اختر الموضوع من القائمة *</label>
        <select id="existing-topic-select" class="input">
          ${existingTopics
            .map((t) => `<option value="${t.id}">${escapeHtml(t.title)}</option>`)
            .join('')}
        </select>
      `;
    }
  }

  renderBody();

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

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  modeNewBtn.addEventListener('click', () => {
    mode = 'new';
    renderBody();
  });

  modeExistingBtn.addEventListener('click', () => {
    mode = 'existing';
    renderBody();
  });

  overlay.querySelector('#modal-cancel').addEventListener('click', cleanup);

  saveBtn.addEventListener('click', async () => {
    errorEl.textContent = '';

    let payload;
    if (mode === 'new') {
      const title = overlay.querySelector('#new-topic-title')?.value?.trim();
      if (!title) {
        errorEl.textContent = 'الرجاء إدخال اسم الموضوع.';
        return;
      }
      payload = { mode: 'new', title };
    } else {
      const topicId = overlay.querySelector('#existing-topic-select')?.value;
      if (!topicId) {
        errorEl.textContent = 'الرجاء اختيار موضوع من القائمة.';
        return;
      }
      payload = { mode: 'existing', topicId };
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ...';

    const result = await onSubmit(payload);

    if (result?.error) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${icons.check(16)} <span>تأكيد الإنجاز</span>`;
      errorEl.textContent = result.error.message || 'حدث خطأ أثناء حفظ الإنجاز';
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