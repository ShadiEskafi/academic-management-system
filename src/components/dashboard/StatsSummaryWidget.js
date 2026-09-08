// src/components/dashboard/StatsSummaryWidget.js
// ودجت ملخص الإحصائيات المركزية الفائقة (Stats Summary Cards Grid)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderStatsSummaryWidget(container, stats = {}) {
  const {
    totalStudyHours = '0.0',
    overallTopicsProgress = 0,
    activeCoursesCount = 0,
    pendingDeadlinesCount = 0,
  } = stats;

  const progress = Number(overallTopicsProgress);
  const displayProgress = (typeof progress === 'number' && !isNaN(progress)) ? Math.round(progress) : 0;

  const wrapper = document.createElement('div');
  wrapper.className = 'dashboard-stats-grid';
  wrapper.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  `;

  wrapper.innerHTML = `
    <!-- بطاقة 1: ساعات المذاكرة المنجزة -->
    <div class="card stat-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);">
      <div class="stat-icon-wrapper" style="
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${icons.clock(24)}
      </div>
      <div>
        <span class="text-secondary" style="font-size: 13px; font-weight: 500;">ساعات المذاكرة المنجزة</span>
        <div style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-top: 2px;">
          ${escapeHtml(totalStudyHours)} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-secondary);">ساعة</span>
        </div>
      </div>
    </div>

    <!-- بطاقة 2: نسبة الإنجاز الأكاديمي العام -->
    <div class="card stat-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);">
      <div class="stat-icon-wrapper" style="
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${icons.trendingUp(24)}
      </div>
      <div style="flex-grow: 1;">
        <span class="text-secondary" style="font-size: 13px; font-weight: 500;">التقدم الأكاديمي العام</span>
        <div style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-top: 2px;">
          ${displayProgress}%
        </div>
        <div style="width: 100%; height: 6px; background: var(--color-bg-secondary); border-radius: 3px; margin-top: 6px; overflow: hidden;">
          <div style="width: ${Math.min(100, Math.max(0, displayProgress))}%; height: 100%; background: #10b981; border-radius: 3px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    </div>

    <!-- بطاقة 3: المقررات النشطة -->
    <div class="card stat-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);">
      <div class="stat-icon-wrapper" style="
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${icons.book(24)}
      </div>
      <div>
        <span class="text-secondary" style="font-size: 13px; font-weight: 500;">المقررات النشطة</span>
        <div style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-top: 2px;">
          ${escapeHtml(activeCoursesCount)} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-secondary);">مادة</span>
        </div>
      </div>
    </div>

    <!-- بطاقة 4: الاستحقاقات القادمة -->
    <div class="card stat-card" style="display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);">
      <div class="stat-icon-wrapper" style="
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        ${icons.calendar(24)}
      </div>
      <div>
        <span class="text-secondary" style="font-size: 13px; font-weight: 500;">الاستحقاقات القادمة</span>
        <div style="font-size: 22px; font-weight: 700; color: var(--color-text); margin-top: 2px;">
          ${escapeHtml(pendingDeadlinesCount)} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-secondary);">مهمة/اختبار</span>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);
}
