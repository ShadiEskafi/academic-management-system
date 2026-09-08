// src/components/dashboard/UpcomingDeadlinesWidget.js
// ودجت قائمة المهام والتكليفات والامتحانات القادمة (Upcoming Deadlines & Exams)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderUpcomingDeadlinesWidget(container, deadlines = []) {
  const card = document.createElement('div');
  card.className = 'card upcoming-deadlines-widget';
  card.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--space-5);
  `;

  let activeFilter = 'all'; // 'all', 'exams', 'assignments'

  function formatArabicDaysRemaining(days) {
    if (days < 0) return 'متأخر';
    if (days === 0) return 'اليوم';
    if (days === 1) return 'غداً';
    if (days === 2) return 'بعد يومين';
    if (days >= 3 && days <= 10) return `بعد ${days} أيام`;
    return `بعد ${days} يوماً`;
  }

  function getDaysRemaining(dateStr) {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function renderList() {
    const listContainer = card.querySelector('#deadlines-list');
    if (!listContainer) return;

    let filtered = deadlines;
    if (activeFilter === 'exams') {
      filtered = deadlines.filter((item) => item.isExam);
    } else if (activeFilter === 'assignments') {
      filtered = deadlines.filter((item) => !item.isExam);
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: var(--space-8) var(--space-4); color: var(--color-text-secondary);">
          <div style="margin-bottom: 8px; opacity: 0.6;">${icons.check(32)}</div>
          <p style="font-size: 14px; font-weight: 500;">لا توجد مواعيد أو استحقاقات قادمة حالياً</p>
          <span style="font-size: 12px;">أنت جاهز تماماً ولا توجد امتحانات أو تسليمات متأخرة!</span>
        </div>
      `;
      return;
    }

    let itemsHtml = '';
    filtered.slice(0, 6).forEach((item) => {
      const daysRemaining = getDaysRemaining(item.date);
      let statusBadgeHtml = '';

      if (daysRemaining !== null) {
        const text = formatArabicDaysRemaining(daysRemaining);
        if (daysRemaining < 0) {
          statusBadgeHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">${text}</span>`;
        } else if (daysRemaining === 0) {
          statusBadgeHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; font-weight: 700;">${text}!</span>`;
        } else if (daysRemaining <= 2) {
          statusBadgeHtml = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #d97706; font-weight: 600;">عاجل (${text})</span>`;
        } else {
          statusBadgeHtml = `<span class="badge" style="background: var(--color-bg-secondary); color: var(--color-text-secondary);">${text}</span>`;
        }
      }

      const iconSvg = item.isExam ? icons.award(18) : icons.fileText(18);
      const iconBg = item.isExam ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)';
      const iconColor = item.isExam ? '#ef4444' : '#6366f1';

      itemsHtml += `
        <div class="deadline-item" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          background: var(--color-bg-secondary);
          margin-bottom: var(--space-2);
          gap: var(--space-3);
          transition: background 0.2s ease;
        ">
          <div style="display: flex; align-items: center; gap: var(--space-3); overflow: hidden;">
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 8px;
              background: ${iconBg};
              color: ${iconColor};
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              ${iconSvg}
            </div>

            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <div style="font-size: 14px; font-weight: 600; color: var(--color-text); text-overflow: ellipsis; overflow: hidden;">
                ${escapeHtml(item.title)}
              </div>
              <div style="font-size: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <span>${escapeHtml(item.courseTitle)}</span>
                <span>•</span>
                <span>${escapeHtml(item.typeLabel)}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
            ${statusBadgeHtml}
            <span style="font-size: 11px; color: var(--color-text-secondary);">
              ${formatDateDisplay(item.date)}
            </span>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = itemsHtml;
  }

  card.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #ef4444;">${icons.calendar(20)}</span>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0;">الاستحقاقات والقادم قريباً</h3>
      </div>

      <div style="display: flex; align-items: center; gap: 4px; background: var(--color-bg-secondary); padding: 3px; border-radius: 8px;">
        <button type="button" class="btn-filter active" data-filter="all" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; border: none; background: var(--color-bg-card); color: var(--color-text); font-weight: 600; cursor: pointer;">الكل</button>
        <button type="button" class="btn-filter" data-filter="exams" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; border: none; background: transparent; color: var(--color-text-secondary); font-weight: 500; cursor: pointer;">الاختبارات</button>
        <button type="button" class="btn-filter" data-filter="assignments" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; border: none; background: transparent; color: var(--color-text-secondary); font-weight: 500; cursor: pointer;">الواجبات</button>
      </div>
    </div>

    <div id="deadlines-list" style="flex-grow: 1;"></div>
  `;

  // ربط أحداث الفلترة
  const filterBtns = card.querySelectorAll('.btn-filter');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach((b) => {
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-secondary)';
        b.style.fontWeight = '500';
      });

      const target = e.currentTarget;
      target.style.background = 'var(--color-bg-card)';
      target.style.color = 'var(--color-text)';
      target.style.fontWeight = '600';

      activeFilter = target.getAttribute('data-filter');
      renderList();
    });
  });

  container.appendChild(card);
  renderList();
}
