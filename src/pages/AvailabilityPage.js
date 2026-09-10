// src/pages/AvailabilityPage.js
// شاشة أوقات التفرغ وفق الـ Design System مع فحص التداخل الزمني وتمرير الفترات المسجلة
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
import { icons } from '../utils/icons.js';
import { skeletons } from '../utils/skeletons.js';
import { escapeHtml } from '../utils/sanitize.js';

export async function renderAvailabilityPage(container) {
  let rawSlots = [];

  container.innerHTML = `
    <div class="page-container">
      <header style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap;">
        <div>
          <h1 style="margin:0 0 var(--space-1);">أوقات التفرغ الأسبوعية</h1>
          <p class="text-secondary" style="font-size:14px;">
            حدد فترات الساعات المتاحة لمذاكرتك خلال الأسبوع ليتمكن النظام من توليد خطتك الذكية.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-global-slot"
          class="btn-primary"
        >
          ${icons.plus(15)}
          <span>إضافة فترة تفرغ</span>
        </button>
      </header>

      <div id="availability-stats-area" style="margin-bottom:var(--space-6);"></div>
      <div id="availability-grid-area"></div>
    </div>
  `;

  const addGlobalBtn = container.querySelector('#btn-add-global-slot');
  const statsArea = container.querySelector('#availability-stats-area');
  const gridArea = container.querySelector('#availability-grid-area');

  addGlobalBtn.addEventListener('click', () => {
    renderAvailabilityModal({
      preselectedDay: 'sunday',
      existingSlots: rawSlots,
      onSave: async (payload) => {
        const { error } = await createAvailabilitySlot(payload);
        if (error) return { error };
        await reloadData();
        return { error: null };
      },
    });
  });

  async function reloadData() {
    gridArea.innerHTML = skeletons.availabilityGrid();
    const { slots, error } = await fetchAvailability();

    if (error) {
      gridArea.innerHTML = `
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل أوقات التفرغ</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
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
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;background:var(--color-surface-soft);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div style="width:42px;height:42px;border-radius:var(--radius-sm);background:var(--color-accent-soft);color:var(--color-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${icons.clock(22)}
          </div>
          <div>
            <span class="text-tertiary" style="font-size:12px;display:block;font-weight:600;text-transform:uppercase;">
              ساعات التفرغ الأسبوعية
            </span>
            <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
              <span style="font-size:24px;font-weight:700;color:var(--color-text);">${formattedText}</span>
              <span class="text-secondary" style="font-size:13px;">(${totalHoursDecimal} ساعة / أسبوع)</span>
            </div>
          </div>
        </div>

        <div class="text-secondary" style="font-size:13px;">
          الفترات المسجلة: <strong style="color:var(--color-text);">${slotsCount}</strong> فترة
        </div>
      </div>
    `;
  }

  function renderGrid() {
    gridArea.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:var(--space-3);">
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
    const dayHoursText = dayTotalMins > 0 ? `${(dayTotalMins / 60).toFixed(1)} س` : 'فارغ';

    return `
      <div class="card" style="display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-3);" data-day="${day.key}">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:var(--space-2);">
          <div>
            <strong style="font-size:14px;display:block;color:var(--color-text);">${day.label}</strong>
            <span class="badge ${dayTotalMins > 0 ? 'badge-accent' : ''}" style="margin-top:4px;font-size:11px;">
              ${dayHoursText}
            </span>
          </div>
          <button
            type="button"
            class="btn-icon btn-quick-add-day"
            data-day="${day.key}"
            title="إضافة فترة ليوم ${day.label}"
            aria-label="إضافة فترة ليوم ${day.label}"
            style="width:28px;height:28px;"
          >
            ${icons.plus(13)}
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-2);min-height:80px;">
          ${
            daySlots.length === 0
              ? `<div class="text-tertiary" style="font-size:12px;text-align:center;margin-top:var(--space-4);">لا توجد فترات</div>`
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
      <div class="card" style="padding:var(--space-2);background:var(--color-surface-soft);border:1px solid var(--color-border);display:flex;flex-direction:column;gap:6px;" data-slot-id="${slot.id}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
          <span class="font-en" style="font-size:12px;font-weight:600;color:var(--color-text);">${startStr} - ${endStr}</span>
          <span class="badge badge-info" style="font-size:10px;padding:1px 6px;">${durationHrs} س</span>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:4px;border-top:1px solid var(--color-border);padding-top:4px;">
          <button type="button" class="btn-icon edit-slot-btn" data-slot-id="${slot.id}" title="تعديل" aria-label="تعديل" style="width:24px;height:24px;">
            ${icons.edit(12)}
          </button>
          <button type="button" class="btn-icon delete-slot-btn" data-slot-id="${slot.id}" title="حذف" aria-label="حذف" style="width:24px;height:24px;color:var(--color-danger);">
            ${icons.trash(12)}
          </button>
        </div>
      </div>
    `;
  }

  function attachGridEvents() {
    gridArea.querySelectorAll('.btn-quick-add-day').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dayKey = btn.dataset.day;
        renderAvailabilityModal({
          preselectedDay: dayKey,
          existingSlots: rawSlots,
          onSave: async (payload) => {
            const { error } = await createAvailabilitySlot(payload);
            if (error) return { error };
            await reloadData();
            return { error: null };
          },
        });
      });
    });

    gridArea.querySelectorAll('.edit-slot-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        const targetSlot = rawSlots.find((s) => s.id === slotId);
        if (!targetSlot) return;

        renderAvailabilityModal({
          initialData: targetSlot,
          existingSlots: rawSlots,
          onSave: async (payload) => {
            const { error } = await updateAvailabilitySlot(targetSlot.id, payload);
            if (error) return { error };
            await reloadData();
            return { error: null };
          },
        });
      });
    });

    gridArea.querySelectorAll('.delete-slot-btn').forEach((btn) => {
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
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const dayObj = DAYS_OF_WEEK.find((d) => d.key === slot.day_of_week);
    const dayLabel = dayObj ? dayObj.label : slot.day_of_week;
    const startStr = formatTimeDisplay(slot.start_time);
    const endStr = formatTimeDisplay(slot.end_time);

    overlay.innerHTML = `
      <div class="modal-content">
        <h3 style="color:var(--color-danger);">تأكيد حذف فترة التفرغ</h3>
        <p class="modal-description">
          هل أنت متأكد من رغبتك في حذف فترة يوم <strong>${dayLabel} (${startStr} - ${endStr})</strong>؟
        </p>

        <p id="del-slot-error" class="field-error"></p>

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
