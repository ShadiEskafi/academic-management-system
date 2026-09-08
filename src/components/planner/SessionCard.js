// src/components/planner/SessionCard.js
// مكون بطاقة الجلسة لشريحة التقويم الأسبوعي (Session Card with Reason Badges)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';

export function renderSessionCard(session = {}, { onDeleteSession, onStartSession } = {}) {
  const card = document.createElement('div');
  card.className = `planner-session-card ${session.status === 'completed' ? 'completed' : ''}`;

  const courseColor = session.courseColor || '#6366f1';
  const isCompleted = session.status === 'completed';

  card.style.cssText = `
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: ${isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-bg-secondary)'};
    border-right: 4px solid ${courseColor};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-2);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    position: relative;
    transition: transform 0.2s ease;
  `;

  // استخراج تفاصيل الجلسة والسبب المعين
  let topicTitle = session.topicTitle || 'موضوع عام';
  let courseTitle = session.courseTitle || 'مساق دراسي';
  let reasonBadgeText = session.reasonBadgeText || '';

  if (session.notes) {
    try {
      const parsed = JSON.parse(session.notes);
      topicTitle = parsed.topicTitle || topicTitle;
      courseTitle = parsed.courseTitle || courseTitle;
      reasonBadgeText = parsed.reasonBadgeText || reasonBadgeText;
    } catch {}
  }

  // حساب النطاق الزمني للشريحة
  let formattedTime = session.formattedTimeRange || '';
  if (!formattedTime && session.scheduled_start && session.scheduled_end) {
    const startD = new Date(session.scheduled_start);
    const endD = new Date(session.scheduled_end);
    const startStr = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;
    const endStr = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
    formattedTime = `${startStr} - ${endStr}`;
  }

  card.setAttribute('data-session-id', session.id || '');
  card.setAttribute('data-action', 'view-session');

  card.innerHTML = `
    <div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
        <span style="font-size: 11px; font-weight: 700; color: ${courseColor};">
          ${escapeHtml(courseTitle)}
        </span>
        <span style="font-size: 10px; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 3px;">
          ${icons.clock(11)} ${escapeHtml(formattedTime)}
        </span>
      </div>

      <h5 style="font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0 0 6px 0; line-height: 1.3;">
        ${escapeHtml(topicTitle)}
      </h5>

      ${
        reasonBadgeText
          ? `<span class="badge" style="font-size: 10px; padding: 2px 6px; background: rgba(99, 102, 241, 0.1); color: var(--color-primary); font-weight: 600; display: inline-block;">
              ${escapeHtml(reasonBadgeText)}
            </span>`
          : ''
      }
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 4px; margin-top: 4px;">
      ${
        isCompleted
          ? `<span style="font-size: 10px; color: #10b981; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;">
              ${icons.check(12)} منجزة
            </span>`
          : `<span style="font-size: 10px; color: var(--color-text-secondary);">مخططة</span>`
      }

      <div style="display: flex; align-items: center; gap: 4px;">
        ${
          !isCompleted
            ? `<button type="button" class="btn-icon delete-planner-session-btn" data-action="delete-session" data-session-id="${session.id || ''}" title="حذف الجلسة المخططة" aria-label="حذف الجلسة المخططة" style="width: 22px; height: 22px; color: var(--color-danger);">
                ${icons.trash(12)}
              </button>`
            : ''
        }
      </div>
    </div>
  `;

  if (!isCompleted && onDeleteSession) {
    card.querySelector('.delete-planner-session-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onDeleteSession(session);
    });
  }

  return card;
}
