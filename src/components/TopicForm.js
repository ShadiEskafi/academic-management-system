// src/components/TopicForm.js
// نموذج إضافة موضوع رئيسي أو فرعي وفق الـ Design System (Phase D)
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';

export function renderTopicForm(container, { parentTopic = null, onSave, onCancel }) {
  const isChild = Boolean(parentTopic);

  const formWrapper = document.createElement('div');
  formWrapper.className = 'card';
  formWrapper.style.marginBottom = 'var(--space-4)';
  formWrapper.style.background = 'var(--color-surface-soft)';

  formWrapper.innerHTML = `
    <form id="topic-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
      <div>
        <h4 style="margin:0 0 4px;font-size:15px;font-weight:600;color:var(--color-text);">
          ${isChild ? 'إضافة موضوع فرعي' : 'إضافة موضوع رئيسي'}
        </h4>
        <p class="text-secondary" style="font-size:13px;margin:0;">
          ${
            isChild
              ? `سيتم تفريع هذا الموضوع داخل: <strong style="color:var(--color-text);">${escapeHtml(parentTopic.title)}</strong>`
              : 'سيتم إنشاء موضوع في المستوى الرئيسي للمساق.'
          }
        </p>
      </div>

      <div class="field" style="margin-bottom:0;">
        <label class="field-label" for="topic-title-input">عنوان الموضوع *</label>
        <input
          id="topic-title-input"
          class="input"
          type="text"
          name="title"
          placeholder="مثال: الخوارزميات التكرارية وحساب التعقيد"
          maxlength="200"
          required
          autocomplete="off"
        />
      </div>

      <p id="topic-error" class="field-error"></p>

      <div style="display:flex;gap:var(--space-2);justify-content:flex-end;">
        <button type="button" class="btn-secondary" id="cancel-topic-btn">إلغاء</button>
        <button type="submit" class="btn-primary" id="save-topic-btn">
          ${icons.plus(15)}
          <span>حفظ الموضوع</span>
        </button>
      </div>
    </form>
  `;

  container.appendChild(formWrapper);

  const form = formWrapper.querySelector('#topic-form');
  const cancelBtn = formWrapper.querySelector('#cancel-topic-btn');
  const errorEl = formWrapper.querySelector('#topic-error');
  const submitBtn = form.querySelector('#save-topic-btn');
  const titleInput = formWrapper.querySelector('#topic-title-input');

  titleInput.focus();

  cancelBtn.addEventListener('click', () => {
    onCancel();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    errorEl.textContent = '';

    if (!title) {
      errorEl.textContent = 'يرجى إدخال عنوان الموضوع.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';
    cancelBtn.disabled = true;

    const result = await onSave({
      title,
      parentId: parentTopic?.id ?? null,
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icons.plus(15)} <span>حفظ الموضوع</span>`;
    cancelBtn.disabled = false;

    if (result?.error) {
      errorEl.textContent = result.error.message || 'حدث خطأ أثناء حفظ الموضوع';
      return;
    }

    form.reset();
  });
}