// src/components/SemesterModals.js
// مودالات تعديل وحذف الفصول الدراسية وفق الـ Design System (Phase D)

export function renderEditSemesterModal(
  semester,
  { onSave, onClose = () => {} },
) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <h3 id="edit-modal-title">تعديل الفصل الدراسي</h3>
      <p class="modal-description">قم بتحديث بيانات الفصل الدراسي وحالته الأكاديمية.</p>

      <form id="edit-semester-form">
        <div class="field">
          <label class="field-label" for="edit-semester-title">اسم الفصل الدراسي</label>
          <input
            id="edit-semester-title"
            class="input"
            type="text"
            name="title"
            value="${escapeHtml(semester.title)}"
            required
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label class="field-label" for="edit-semester-status">الحالة الأكاديمية</label>
          <select id="edit-semester-status" class="input" name="status">
            <option value="planned" ${semester.status === "planned" ? "selected" : ""}>مخطط له (Planned)</option>
            <option value="in_progress" ${semester.status === "in_progress" ? "selected" : ""}>قيد الدراسة (In Progress)</option>
            <option value="completed" ${semester.status === "completed" ? "selected" : ""}>مكتمل (Completed)</option>
          </select>
        </div>

        <p id="edit-semester-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-edit-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-edit-btn">حفظ التعديلات</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector("#edit-semester-form");
  const cancelBtn = overlay.querySelector("#cancel-edit-btn");
  const submitBtn = overlay.querySelector("#save-edit-btn");
  const errorEl = overlay.querySelector("#edit-semester-error");
  const titleInput = overlay.querySelector("#edit-semester-title");

  titleInput.focus();

  function cleanup() {
    window.removeEventListener("keydown", handleKeyDown);
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") cleanup();
  }

  window.addEventListener("keydown", handleKeyDown);
  cancelBtn.addEventListener("click", cleanup);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cleanup();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");

    const formData = new FormData(form);
    const newTitle = formData.get("title").trim();
    const newStatus = formData.get("status");

    const result = await onSave(semester.id, {
      title: newTitle,
      status: newStatus,
    });

    if (result?.error) {
      errorEl.textContent = result.error.message || "فشل حفظ التعديلات";
      submitBtn.disabled = false;
      submitBtn.classList.remove("btn-loading");
    } else {
      cleanup();
    }
  });
}

export function renderDeleteSemesterModal(
  semester,
  { onDelete, onClose = () => {} },
) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <h3 id="delete-modal-title" style="color:var(--color-danger);">حذف الفصل الدراسي</h3>
      <p class="modal-description">
        أنت على وشك حذف <strong>"${escapeHtml(semester.title)}"</strong>. سيؤدي هذا الإجراء إلى حذف كافة المساقات والمواضيع والبيانات التابعة له فوراً.
      </p>

      <div class="field" style="margin-block:var(--space-4);">
        <label class="field-label" for="delete-confirm-input">لتأكيد الحذف، اكتب اسم الفصل كما هو تماماً:</label>
        <div style="padding:var(--space-2) var(--space-3);background:var(--color-surface-muted);border:1px solid var(--color-border);border-radius:var(--radius-sm);font-weight:600;font-size:13px;margin-bottom:var(--space-2);color:var(--color-text);">
          ${escapeHtml(semester.title)}
        </div>
        <input
          type="text"
          id="delete-confirm-input"
          class="input"
          placeholder="اكتب اسم الفصل هنا للتأكيد..."
          autocomplete="off"
        />
      </div>

      <p id="delete-semester-error" class="field-error"></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="cancel-delete-btn">إلغاء</button>
        <button type="button" class="btn-danger" id="confirm-delete-btn" disabled>حذف الفصل</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmInput = overlay.querySelector("#delete-confirm-input");
  const confirmBtn = overlay.querySelector("#confirm-delete-btn");
  const cancelBtn = overlay.querySelector("#cancel-delete-btn");
  const errorEl = overlay.querySelector("#delete-semester-error");

  confirmInput.focus();

  confirmInput.addEventListener("input", (e) => {
    confirmBtn.disabled = e.target.value.trim() !== semester.title.trim();
  });

  function cleanup() {
    window.removeEventListener("keydown", handleKeyDown);
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") cleanup();
  }

  window.addEventListener("keydown", handleKeyDown);
  cancelBtn.addEventListener("click", cleanup);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cleanup();
  });

  confirmBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    confirmBtn.disabled = true;
    confirmBtn.classList.add('btn-loading');

    const result = await onDelete(semester.id);

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حذف الفصل، تأكد من إعدادات قاعدة البيانات';
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
