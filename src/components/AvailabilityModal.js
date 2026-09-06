// src/components/AvailabilityModal.js
// مودال إضافة وتعديل فترات التفرغ الأسبوعية مع فحص المدخلات

import {
  DAYS_OF_WEEK,
  formatTimeDisplay,
  calculateSlotDurationMinutes,
} from '../api/availability.js';

export function renderAvailabilityModal({
  initialData = null,
  preselectedDay = 'sunday',
  onSave,
  onClose = () => {},
}) {
  const isEditing = Boolean(initialData);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const defaultDay = initialData?.day_of_week || preselectedDay || 'sunday';
  const defaultStart = initialData ? formatTimeDisplay(initialData.start_time) : '18:00';
  const defaultEnd = initialData ? formatTimeDisplay(initialData.end_time) : '20:00';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <h3 style="margin-bottom:0.4rem;">${isEditing ? 'تعديل فترة التفرغ' : 'إضافة فترة تفرغ جديدة ⏰'}</h3>
      <p style="font-size:13px;color:var(--text);margin-bottom:1.25rem;">
        حدد اليوم ووقت البدء والانتهاء المتاحين لديك للمذاكرة.
      </p>

      <form id="availability-modal-form">
        <div style="margin-bottom:1rem;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">يوم الأسبوع *</label>
          <select name="dayOfWeek" id="avail-day-select" required>
            ${DAYS_OF_WEEK.map(
              (d) => `
              <option value="${d.key}" ${d.key === defaultDay ? 'selected' : ''}>
                ${d.label}
              </option>
            `
            ).join('')}
          </select>
        </div>

        <div style="display:flex;gap:0.75rem;margin-bottom:1rem;">
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:6px;">من الساعة *</label>
            <input
              type="time"
              name="startTime"
              id="avail-start-time"
              value="${defaultStart}"
              required
            />
          </div>
          <div style="flex:1;">
            <label style="font-weight:600;display:block;margin-bottom:6px;">إلى الساعة *</label>
            <input
              type="time"
              name="endTime"
              id="avail-end-time"
              value="${defaultEnd}"
              required
            />
          </div>
        </div>

        <!-- معاينة المدة التقديرية للفترة -->
        <div id="slot-duration-preview" class="slot-duration-hint">
          المدة المحتسبة: <strong>2 ساعة</strong>
        </div>

        <p id="avail-modal-error" style="color:#ef4444;font-size:13px;margin:0.5rem 0 0;"></p>

        <div class="modal-actions" style="margin-top:1.25rem;">
          <button type="button" class="btn-secondary" id="cancel-avail-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-avail-btn">
            ${isEditing ? 'حفظ التعديلات' : 'إضافة الفترة'}
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
  const startInput = overlay.querySelector('#avail-start-time');
  const endInput = overlay.querySelector('#avail-end-time');
  const durationPreview = overlay.querySelector('#slot-duration-preview');

  function updateDurationDisplay() {
    const mins = calculateSlotDurationMinutes(startInput.value, endInput.value);
    if (mins <= 0) {
      durationPreview.innerHTML = `<span style="color:#ef4444;">⚠️ وقت النهاية يجب أن يكون بعد وقت البداية.</span>`;
    } else {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      let text = '';
      if (hrs > 0) text += `${hrs} ساعة`;
      if (hrs > 0 && remMins > 0) text += ' و ';
      if (remMins > 0) text += `${remMins} دقيقة`;
      durationPreview.innerHTML = `المدة المحتسبة: <strong style="color:var(--primary);">${text}</strong>`;
    }
  }

  startInput.addEventListener('input', updateDurationDisplay);
  endInput.addEventListener('input', updateDurationDisplay);
  updateDurationDisplay();

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
      saveBtn.textContent = isEditing ? 'حفظ التعديلات' : 'إضافة الفترة';
    } else {
      cleanup();
    }
  });
}