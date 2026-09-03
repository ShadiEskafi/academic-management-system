// src/components/TopicForm.js
// Component "غبي": فورم إنشاء Topic — بدون أي Business Logic.

export function renderTopicForm(container, { parentTopic = null, onSave, onCancel }) {
  const isChild = Boolean(parentTopic);

  const formWrapper = document.createElement('div');

  formWrapper.style.cssText = `
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    background: #fafafa;
  `;

  formWrapper.innerHTML = `
    <form id="topic-form" style="display:flex;flex-direction:column;gap:0.6rem;">
      <div>
        <strong>${isChild ? 'Add Subtopic' : 'Add Topic'}</strong>
        ${
          isChild
            ? `<p style="font-size:12px;opacity:0.7;margin:0.35rem 0 0;">
                سيتم إضافة Topic جديد تحت: ${parentTopic.title}
              </p>`
            : `<p style="font-size:12px;opacity:0.7;margin:0.35rem 0 0;">
                سيتم إنشاء Topic رئيسي لهذا المساق.
              </p>`
        }
      </div>

      <input
        type="text"
        name="title"
        placeholder="Topic title"
        maxlength="200"
        required
      />

      <p
        id="topic-error"
        style="color:#e05252;font-size:14px;margin:0;"
      ></p>

      <div style="display:flex;gap:0.5rem;">
        <button type="submit">Save</button>
        <button type="button" id="cancel-topic-btn">Cancel</button>
      </div>
    </form>
  `;

  container.appendChild(formWrapper);

  const form = formWrapper.querySelector('#topic-form');
  const cancelBtn = formWrapper.querySelector('#cancel-topic-btn');
  const errorEl = formWrapper.querySelector('#topic-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  cancelBtn.addEventListener('click', () => {
    onCancel();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const title = String(formData.get('title') ?? '').trim();

    errorEl.textContent = '';

    if (!title) {
      errorEl.textContent = 'يرجى إدخال اسم الـ Topic.';
      return;
    }

    submitBtn.disabled = true;
    cancelBtn.disabled = true;

    const result = await onSave({
      title,
      parentId: parentTopic?.id ?? null,
    });

    submitBtn.disabled = false;
    cancelBtn.disabled = false;

    if (result?.error) {
      errorEl.textContent =
        result.error.message ?? 'حدث خطأ، حاول مرة ثانية';
      return;
    }

    form.reset();
  });
}