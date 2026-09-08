// src/components/AvailabilityModal.js
// مودال إضافة وتعديل فترات التفرغ الأسبوعية مع فحص التداخل اللحظي
import {
  DAYS_OF_WEEK,
  formatTimeDisplay,
  calculateSlotDurationMinutes,
  hasSlotOverlap,
} from '../api/availability.js';
import { icons } from '../utils/icons.js';

export function renderAvailabilityModal({
  initialData = null,
  preselectedDay = 'sunday',
  existingSlots = [],
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'avail-modal-title');

  const defaultDay = initialData?.day_of_week || preselectedDay || 'sunday';
  const defaultStart = initialData ? formatTimeDisplay(initialData.start_time) : '18:00';
  const defaultEnd = initialData ? formatTimeDisplay(initialData.end_time) : '20:00';

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="avail-modal-title">${isEditing ? 'تعديل فترة التفرغ' : 'إضافة فترة تفرغ جديدة'}</h3>
      <p class="modal-description">حدد اليوم ووقت البدء والانتهاء المتاحين لديك للمذاكرة الأسبوعية.</p>

      <form id="availability-modal-form">
        <div class="field">
          <label class="field-label" for="avail-day-select">يوم الأسبوع *</label>
          <select class="input" name="dayOfWeek" id="avail-day-select" required>
            ${DAYS_OF_WEEK.map(
              (d) => `
              <option value="${d.key}" ${d.key === defaultDay ? 'selected' : ''}>
                ${d.label}
              </option>
            `
            ).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
          <div class="field">
            <label class="field-label" for="avail-start-time">من الساعة *</label>
            <input
              class="input font-en"
              type="time"
              name="startTime"
              id="avail-start-time"
              value="${defaultStart}"
              required
            />
          </div>
          <div class="field">
            <label class="field-label" for="avail-end-time">إلى الساعة *</label>
            <input
              class="input font-en"
              type="time"
              name="endTime"
              id="avail-end-time"
              value="${defaultEnd}"
              required
            />
          </div>
        </div>

        <div id="slot-duration-preview" class="card" style="background:var(--color-surface-soft);padding:var(--space-2) var(--space-3);margin-block:var(--space-3);font-size:13px;">
          المدة المحتسبة: <strong>2 ساعة</strong>
        </div>

        <p id="avail-modal-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-avail-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-avail-btn">
            ${isEditing ? icons.check(15) : icons.plus(15)}
            <span>${isEditing ? 'حفظ التعديلات' : 'إضافة الفترة'}</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#availability-modal-form');
  const cancelBtn = overlay.querySelector('#cancel-avail-btn');
  const saveBtn = overlay.querySelector('#save-avail-btn');
  const errorEl = overlay.querySelector('#avail-modal-error');
  const daySelect = overlay.querySelector('#avail-day-select');
  const startInput = overlay.querySelector('#avail-start-time');
  const endInput = overlay.querySelector('#avail-end-time');
  const durationPreview = overlay.querySelector('#slot-duration-preview');

  function validateInputs() {
    const mins = calculateSlotDurationMinutes(startInput.value, endInput.value);
    if (mins <= 0) {
      durationPreview.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:6px;color:var(--color-danger);">
          ${icons.alertTriangle(14)}
          <span>وقت النهاية يجب أن يكون بعد وقت البداية.</span>
        </span>
      `;
      return false;
    }

    // فحص التداخل للتيار الحالي
    const selectedDay = daySelect.value;
    const currentDaySlots = existingSlots.filter((s) => s.day_of_week === selectedDay);
    const excludeId = isEditing ? initialData.id : null;
    const isOverlapping = hasSlotOverlap(startInput.value, endInput.value, currentDaySlots, excludeId);

    if (isOverlapping) {
      durationPreview.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:6px;color:var(--color-danger);">
          ${icons.alertTriangle(14)}
          <span>توجد فترة تفرغ متداخلة في نفس اليوم.</span>
        </span>
      `;
      return false;
    }

    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    let text = '';
    if (hrs > 0) text += `${hrs} ساعة`;
    if (hrs > 0 && remMins > 0) text += ' و ';
    if (remMins > 0) text += `${remMins} دقيقة`;
    durationPreview.innerHTML = `المدة المحتسبة: <strong style="color:var(--color-accent);">${text}</strong>`;
    return true;
  }

  startInput.addEventListener('input', validateInputs);
  endInput.addEventListener('input', validateInputs);
  daySelect.addEventListener('change', validateInputs);
  validateInputs();

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

    const formData = new FormData(form);
    const dayOfWeek = formData.get('dayOfWeek');
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');

    const mins = calculateSlotDurationMinutes(startTime, endTime);
    if (mins <= 0) {
      errorEl.textContent = 'وقت النهاية يجب أن يكون بعد وقت البداية.';
      return;
    }

    const currentDaySlots = existingSlots.filter((s) => s.day_of_week === dayOfWeek);
    const excludeId = isEditing ? initialData.id : null;
    if (hasSlotOverlap(startTime, endTime, currentDaySlots, excludeId)) {
      errorEl.textContent = 'تتعارض هذه الفترة مع فترة تفرغ أخرى مسجلة مسبقاً في نفس اليوم.';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ...';

    const result = await onSave({
      dayOfWeek,
      startTime,
      endTime,
    });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ فترة التفرغ، حاول مرة أخرى.';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>${isEditing ? 'حفظ التعديلات' : 'إضافة الفترة'}</span>`;
    } else {
      cleanup();
    }
  });
}