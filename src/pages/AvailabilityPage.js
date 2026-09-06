// src/pages/AvailabilityPage.js
// شاشة إدارة أوقات التفرغ الأسبوعية وشبكة الأيام السبعة (UC-12)

import {
  DAYS_OF_WEEK,
  fetchAvailability,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  formatTimeDisplay,
  calculateSlotDurationMinutes,
  calculateTotalWeeklyHours,
} from '../api/availability.js';

import { renderAvailabilityModal } from '../components/AvailabilityModal.js';

export async function renderAvailabilityPage(container) {
  let rawSlots = [];

  container.innerHTML = `
    <div class="availability-page-container">
      <div class="availability-header-bar">
        <div>
          <h2 style="margin:0 0 0.25rem;display:flex;align-items:center;gap:8px;">
            ⏰ أوقات التفرغ الأسبوعية
          </h2>
          <p style="margin:0;font-size:14px;color:var(--text);">
            حدد الساعات المتاحة لمذاكرتك خلال الأسبوع ليتمكن النظام من توليد خطتك الأسبوعية بذكاء.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-global-slot"
          class="btn-primary"
          style="padding:0.5rem 1rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;"
        >
          + إضافة فترة تفرغ ⏰
        </button>
      </div>

      <!-- بطاقة إحصائيات الساعات الأسبوعية -->
      <div id="availability-stats-area"></div>

      <!-- شبكة الأيام السبعة -->
      <div id="availability-grid-area" class="availability-grid-container">
        <p style="color:var(--text);font-size:14px;">جاري تحميل أوقات التفرغ...</p>
      </div>
    </div>
  `;

  const addGlobalBtn = container.querySelector('#btn-add-global-slot');
  const statsArea = container.querySelector('#availability-stats-area');
  const gridArea = container.querySelector('#availability-grid-area');

  addGlobalBtn.addEventListener('click', () => {
    renderAvailabilityModal({
      preselectedDay: 'sunday',
      onSave: async (payload) => {
        const { error } = await createAvailabilitySlot(payload);
        if (error) return { error };
        await reloadData();
        return { error: null };
      },
    });
  });

  async function reloadData() {
    gridArea.innerHTML = `<p style="color:var(--text);font-size:14px;">جاري تحديث البيانات...</p>`;
    const { slots, error } = await fetchAvailability();

    if (error) {
      gridArea.innerHTML = `<p style="color:#ef4444;font-size:14px;">فشل تحميل أوقات التفرغ: ${escapeHtml(error.message)}</p>`;
      return;
    }

    rawSlots = slots || [];
    renderStats();
    renderGrid();
  }

  function renderStats() {
    const { formattedText, totalHoursDecimal } = calculateTotalWeeklyHours(rawSlots);
    const slotsCount = rawSlots.length;

    statsArea.innerHTML = `
      <div class="availability-stats-banner">
        <div style="display:flex;align-items:center;gap:1rem;">
          <div class="stats-icon-box">⚡</div>
          <div>
            <span style="font-size:12px;color:var(--text);display:block;font-weight:500;">
              إجمالي الطاقة الاستيعابية الأسبوعية (Study Capacity)
            </span>
            <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
              <span style="font-size:22px;font-weight:700;color:var(--text-h);">${formattedText}</span>
              <span style="font-size:13px;color:var(--text);">(${totalHoursDecimal} ساعة / أسبوعياً)</span>
            </div>
          </div>
        </div>

        <div style="font-size:13px;color:var(--text);text-align:left;">
          فترات التفرغ المسجلة: <strong style="color:var(--text-h);">${slotsCount}</strong> فترة
        </div>
      </div>
    `;
  }

  function renderGrid() {
    gridArea.innerHTML = `
      <div class="availability-week-grid">
        ${DAYS_OF_WEEK.map((day) => renderDayColumn(day)).join('')}
      </div>
    `;

    attachGridEvents();
  }

  function renderDayColumn(day) {
    const daySlots = rawSlots.filter((s) => s.day_of_week === day.key);
    let dayTotalMins = 0;
    daySlots.forEach((s) => {
      dayTotalMins += calculateSlotDurationMinutes(s.start_time, s.end_time);
    });
    const dayHoursText = dayTotalMins > 0 ? `${(dayTotalMins / 60).toFixed(1)} ساعة` : 'فارغ';

    return `
      <div class="day-column-card" data-day="${day.key}">
        <div class="day-column-header">
          <div>
            <span class="day-name-label">${day.label}</span>
            <span class="day-hours-badge ${dayTotalMins > 0 ? 'active' : ''}">${dayHoursText}</span>
          </div>
          <button
            type="button"
            class="btn-quick-add-day"
            data-day="${day.key}"
            title="إضافة وقت ليوم ${day.label}"
          >
            +
          </button>
        </div>

        <div class="day-slots-list">
          ${
            daySlots.length === 0
              ? `<div class="empty-day-slot">لا توجد فترات</div>`
              : daySlots.map((slot) => renderSlotItem(slot)).join('')
          }
        </div>
      </div>
    `;
  }

  function renderSlotItem(slot) {
    const startStr = formatTimeDisplay(slot.start_time);
    const endStr = formatTimeDisplay(slot.end_time);
    const durationMins = calculateSlotDurationMinutes(slot.start_time, slot.end_time);
    const durationHrs = (durationMins / 60).toFixed(1);

    return `
      <div class="slot-item-box" data-slot-id="${slot.id}">
        <div class="slot-time-info">
          <span class="slot-time-range">🕒 ${startStr} - ${endStr}</span>
          <span class="slot-duration-pill">${durationHrs} س</span>
        </div>
        <div class="slot-actions">
          <button type="button" class="action-btn edit-slot-btn" data-slot-id="${slot.id}" title="تعديل">✏️</button>
          <button type="button" class="action-btn delete-slot-btn" data-slot-id="${slot.id}" title="حذف" style="color:#ef4444;">🗑️</button>
        </div>
      </div>
    `;
  }

  function attachGridEvents() {
    // أزرار الإضافة السريعة لكل يوم
    const quickAddBtns = gridArea.querySelectorAll('.btn-quick-add-day');
    quickAddBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dayKey = btn.dataset.day;
        renderAvailabilityModal({
          preselectedDay: dayKey,
          onSave: async (payload) => {
            const { error } = await createAvailabilitySlot(payload);
            if (error) return { error };
            await reloadData();
            return { error: null };
          },
        });
      });
    });

    // أزرار التعديل
    const editBtns = gridArea.querySelectorAll('.edit-slot-btn');
    editBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        const targetSlot = rawSlots.find((s) => s.id === slotId);
        if (!targetSlot) return;

        renderAvailabilityModal({
          initialData: targetSlot,
          onSave: async (payload) => {
            const { error } = await updateAvailabilitySlot(targetSlot.id, payload);
            if (error) return { error };
            await reloadData();
            return { error: null };
          },
        });
      });
    });

    // أزرار الحذف
    const deleteBtns = gridArea.querySelectorAll('.delete-slot-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        const targetSlot = rawSlots.find((s) => s.id === slotId);
        if (!targetSlot) return;

        renderDeleteSlotConfirmModal(targetSlot, async () => {
          const { error } = await deleteAvailabilitySlot(targetSlot.id);
          if (error) return { error };
          await reloadData();
          return { error: null };
        });
      });
    });
  }

  function renderDeleteSlotConfirmModal(slot, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dayObj = DAYS_OF_WEEK.find((d) => d.key === slot.day_of_week);
    const dayLabel = dayObj ? dayObj.label : slot.day_of_week;
    const startStr = formatTimeDisplay(slot.start_time);
    const endStr = formatTimeDisplay(slot.end_time);

    overlay.innerHTML = `
      <div class="modal-content" style="border-top: 4px solid #ef4444;max-width:420px;">
        <h3 style="color:#ef4444;margin-bottom:0.5rem;">تأكيد حذف فترة التفرغ</h3>
        <p style="font-size:14px;line-height:1.5;margin-bottom:1rem;">
          هل أنت متأكد من حذف فترة <strong>${dayLabel} (${startStr} - ${endStr})</strong>؟
        </p>

        <p id="del-slot-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-del-slot-btn">إلغاء</button>
          <button type="button" class="btn-danger" id="confirm-del-slot-btn">تأكيد الحذف</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#cancel-del-slot-btn');
    const confirmBtn = overlay.querySelector('#confirm-del-slot-btn');
    const errEl = overlay.querySelector('#del-slot-error');

    function cleanup() {
      if (overlay.parentElement) document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', cleanup);

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'جاري الحذف...';
      const result = await onConfirm();
      if (result?.error) {
        errEl.textContent = result.error.message || 'فشل حذف الفترة.';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'تأكيد الحذف';
      } else {
        cleanup();
      }
    });
  }

  await reloadData();

  return () => {
    container.innerHTML = '';
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}