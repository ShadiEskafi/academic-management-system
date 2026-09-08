// src/components/dashboard/WeeklyActivityWidget.js
// ودجت الرسم البياني التفاعلي لساعات المذاكرة الأسبوعية (Pure Native SVG / CSS Bars - 0 External Dependencies)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderWeeklyActivityWidget(container, weeklyStats = {}) {
  const {
    hoursByDay = [0, 0, 0, 0, 0, 0, 0],
    totalHours = '0.0',
    targetWeeklyHours = '0.0',
  } = weeklyStats;

  const dayLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayIndex = new Date().getDay(); // 0 = Sunday

  const maxVal = Math.max(...hoursByDay, 4); // Minimum max Y range of 4 hours for nice scale

  const card = document.createElement('div');
  card.className = 'card weekly-activity-widget';
  card.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-5);
  `;

  let barsHtml = '';
  hoursByDay.forEach((val, idx) => {
    const isToday = idx === todayIndex;
    const heightPercent = Math.min(100, Math.max(5, (val / maxVal) * 100));
    const barColor = isToday
      ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)'
      : val > 0
      ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.7) 0%, rgba(99, 102, 241, 0.4) 100%)'
      : 'var(--color-bg-secondary)';

    barsHtml += `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        height: 100%;
        justify-content: flex-end;
        gap: 6px;
      ">
        <span style="font-size: 11px; font-weight: 700; color: ${isToday ? '#6366f1' : 'var(--color-text-secondary)'};">
          ${val > 0 ? val + 'س' : ''}
        </span>

        <div style="
          width: 100%;
          max-width: 32px;
          height: ${heightPercent}%;
          background: ${barColor};
          border-radius: 6px 6px 2px 2px;
          transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        ">
          ${
            isToday
              ? `<span style="
                  position: absolute;
                  top: -6px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  background: #6366f1;
                  border-radius: 50%;
                "></span>`
              : ''
          }
        </div>

        <span style="
          font-size: 11px;
          font-weight: ${isToday ? '700' : '500'};
          color: ${isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'};
          margin-top: 4px;
        ">
          ${dayLabels[idx]}
        </span>
      </div>
    `;
  });

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--color-primary);">${icons.barChart(20)}</span>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0;">النشاط والساعات الأسبوعية</h3>
      </div>

      <div style="font-size: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 12px;">
        <span>الإجمالي: <strong style="color: var(--color-text);">${escapeHtml(totalHours)} س</strong></span>
        <span>|</span>
        <span>المستهدف: <strong style="color: var(--color-primary);">${escapeHtml(targetWeeklyHours)} س</strong></span>
      </div>
    </div>

    <!-- منطقة الرسم البياني الأعمدة -->
    <div style="
      flex-grow: 1;
      min-height: 180px;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      padding-top: var(--space-4);
      padding-bottom: var(--space-2);
      border-bottom: 1px dashed var(--color-border);
    ">
      ${barsHtml}
    </div>

    <div style="margin-top: var(--space-3); display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--color-text-secondary);">
      <span>• اليوم المحدد بنقطة هو اليوم الحالي</span>
      <span>محدث تلقائياً مع كل جلسة مكتملة</span>
    </div>
  `;

  container.appendChild(card);
}
