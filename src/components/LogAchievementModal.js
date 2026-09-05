// src/components/LogAchievementModal.js
// Component "غبي": يرسم Modal بسيط لتسجيل إنجاز، بدون أي لمسة لـ Supabase.
// وضعين: "موضوع جديد" (اسم حر) أو "من القائمة" (اختيار من Topics غير مكتملة).

export function renderLogAchievementModal({ existingTopics, onSubmit, onClose }) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.55);
    display:flex; align-items:center; justify-content:center; z-index:1000;
  `;

  overlay.innerHTML = `
    <div style="background:#1e1e1e;border:1px solid #333;border-radius:8px;padding:1.5rem;width:340px;max-width:90vw;">
      <h3 style="margin:0 0 1rem;">سجّل إنجاز جديد</h3>

      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
        <button type="button" id="mode-existing" style="flex:1;">من القائمة</button>
        <button type="button" id="mode-new" style="flex:1;">موضوع جديد</button>
      </div>

      <div id="modal-body"></div>

      <p id="modal-error" style="color:#e05252;font-size:13px;min-height:1em;"></p>

      <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
        <button type="button" id="modal-cancel">إلغاء</button>
        <button type="button" id="modal-save">حفظ</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let mode = existingTopics.length > 0 ? 'existing' : 'new';
  const modalBody = overlay.querySelector('#modal-body');
  const errorEl = overlay.querySelector('#modal-error');
  const saveBtn = overlay.querySelector('#modal-save');

  function renderBody() {
    if (mode === 'new') {
      modalBody.innerHTML = `
        <input type="text" id="new-topic-title" placeholder="اسم الموضوع الذي أنجزته" style="width:100%;box-sizing:border-box;" />
      `;
    } else if (existingTopics.length === 0) {
      modalBody.innerHTML = `<p style="opacity:0.7;font-size:13px;">لا يوجد مواضيع غير مكتملة بعد — أضف موضوع جديد.</p>`;
    } else {
      modalBody.innerHTML = `
        <select id="existing-topic-select" style="width:100%;">
          ${existingTopics.map((t) => `<option value="${t.id}">${t.title}</option>`).join('')}
        </select>
      `;
    }
  }
  renderBody();

  overlay.querySelector('#mode-new').addEventListener('click', () => {
    mode = 'new';
    renderBody();
  });
  overlay.querySelector('#mode-existing').addEventListener('click', () => {
    mode = 'existing';
    renderBody();
  });

  overlay.querySelector('#modal-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
    onClose?.();
  });

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
        errorEl.textContent = 'الرجاء اختيار موضوع.';
        return;
      }
      payload = { mode: 'existing', topicId };
    }

    saveBtn.disabled = true;
    const result = await onSubmit(payload);
    saveBtn.disabled = false;

    if (result?.error) {
      errorEl.textContent = result.error.message ?? 'حدث خطأ، حاول مرة ثانية';
      return;
    }

    document.body.removeChild(overlay);
  });
}