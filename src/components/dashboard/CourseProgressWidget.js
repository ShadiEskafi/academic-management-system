// src/components/dashboard/CourseProgressWidget.js
// ودجت نظرة عامة على التقدم في المواد الدراسية (Course Progress Grid Cards)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { navigate } from '../../state/router.js';

export function renderCourseProgressWidget(container, { courses = [], semesterId = '' } = {}) {
  const card = document.createElement('div');
  card.className = 'dashboard-courses-progress-widget';
  card.style.cssText = `margin-bottom: var(--space-6);`;

  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--color-primary);">${icons.book(20)}</span>
        <h3 style="font-size: 16px; font-weight: 700; color: var(--color-text); margin: 0;">التقدم في المواد الدراسية</h3>
      </div>
      <button type="button" class="btn-secondary" id="btn-view-all-courses" style="font-size: 12px; padding: 4px 12px; min-height: 32px; flex-shrink: 0;">
        عرض جميع المواد
      </button>
    </div>
  `;

  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-4);
  `;

  if (courses.length === 0) {
    gridContainer.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: var(--space-6); color: var(--color-text-secondary);">
        <p style="font-size: 14px; font-weight: 500;">لا توجد مواد مسجلة في هذا الفصل بعد</p>
        <button type="button" class="btn-primary" id="btn-add-first-course" style="margin-top: 12px; font-size: 13px;">
          إضافة مادة دراسية جديدة
        </button>
      </div>
    `;

    gridContainer.querySelector('#btn-add-first-course')?.addEventListener('click', () => {
      if (semesterId) navigate(`/semesters/${semesterId}/courses`);
    });
  } else {
    courses.forEach((course) => {
      const courseCard = document.createElement('div');
      courseCard.className = 'card course-progress-card';
      courseCard.style.cssText = `
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: var(--space-3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: pointer;
      `;

      const progressPct = course.progressPercentage || course.progress || 0;
      const completedCount = course.completedTopics || 0;
      const totalCount = course.totalTopics || 0;
      const currentTopic = course.current_position_topic_title || 'لا يوجد موقف محدد';

      courseCard.innerHTML = `
        <div>
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.4;">
              ${escapeHtml(course.title)}
            </h4>
            <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: var(--color-primary); font-size: 11px; flex-shrink: 0;">
              ${escapeHtml(course.credit_hours || 3)} ساعات
            </span>
          </div>

          <div style="margin-top: var(--space-3);">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px;">
              <span>نسبة الإنجاز</span>
              <span style="font-weight: 700; color: var(--color-text);">${progressPct}% (${completedCount}/${totalCount})</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--color-bg-secondary); border-radius: 4px; overflow: hidden;">
              <div style="width: ${Math.min(100, Math.max(0, progressPct))}%; height: 100%; background: linear-gradient(90deg, #6366f1, #10b981); border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-3); margin-top: var(--space-1); display: flex; align-items: center; justify-content: space-between;">
          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
            <span style="font-size: 11px; color: var(--color-text-secondary); display: block;">الموضوع الحالي:</span>
            <span style="font-size: 12px; font-weight: 600; color: var(--color-text); text-overflow: ellipsis; overflow: hidden; display: block;">
              ${escapeHtml(currentTopic)}
            </span>
          </div>

          <span style="color: var(--color-primary); display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;">
            تابع ${icons.chevronLeft(14)}
          </span>
        </div>
      `;

      courseCard.addEventListener('click', () => {
        if (semesterId && course.id) {
          navigate(`/semesters/${semesterId}/courses/${course.id}`);
        }
      });

      gridContainer.appendChild(courseCard);
    });
  }

  card.appendChild(gridContainer);

  card.querySelector('#btn-view-all-courses')?.addEventListener('click', () => {
    if (semesterId) navigate(`/semesters/${semesterId}/courses`);
  });

  container.appendChild(card);
}
