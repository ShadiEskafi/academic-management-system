// src/components/dashboard/ActiveSessionWidget.js
// ودجت الجلسة النشطة الحالية والبدء السريع للمذاكرة (Active Session Banner / Quick Start)

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { getActiveSession, startNewGlobalSession, subscribeToSession } from '../../utils/sessionManager.js';
import { showToast } from '../../utils/toast.js';

export function renderActiveSessionWidget(container, { activeSession = null, courses = [], onSessionUpdate } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dashboard-active-session-container';
  wrapper.style.cssText = `margin-bottom: var(--space-6);`;

  function renderContent(currentSession) {
    wrapper.innerHTML = '';

    if (currentSession) {
      // --------------------------------------------------------
      // لافتة الجلسة النشطة القائمة
      // --------------------------------------------------------
      const banner = document.createElement('div');
      banner.className = 'card active-session-banner';
      banner.style.cssText = `
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: var(--radius-lg);
        padding: var(--space-4) var(--space-5);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      `;

      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-4);">
          <div style="
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #6366f1;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            ${icons.play(20)}
            <span style="
              position: absolute;
              top: -2px;
              right: -2px;
              width: 12px;
              height: 12px;
              background: #10b981;
              border: 2px solid var(--color-bg-card);
              border-radius: 50%;
              animation: pulse 1.5s infinite;
            "></span>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: #6366f1; font-weight: 600; font-size: 11px;">
                جلسة نشطة حالياً
              </span>
              ${currentSession.course_title ? `<span style="font-size: 13px; color: var(--color-text-secondary);">${escapeHtml(currentSession.course_title)}</span>` : ''}
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--color-text); margin-top: 4px;">
              ${escapeHtml(currentSession.topic_title || 'موضوع عام')}
            </h3>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 13px; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 4px;">
            ${icons.clock(14)} الجلسة قيد التتبع بشريط العلوية
          </span>
        </div>
      `;

      wrapper.appendChild(banner);
    } else {
      // --------------------------------------------------------
      // بطاقة البدء السريع لجلسة مذاكرة جديدة
      // --------------------------------------------------------
      const quickCard = document.createElement('div');
      quickCard.className = 'card quick-start-session-card';
      quickCard.style.cssText = `
        padding: var(--space-4) var(--space-5);
        background: var(--color-bg-card);
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
      `;

      let courseOptions = '<option value="">اختر المساق الدراسي...</option>';
      courses.forEach((c) => {
        courseOptions += `<option value="${c.id}">${escapeHtml(c.title)}</option>`;
      });

      quickCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: rgba(99, 102, 241, 0.1);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${icons.zap(20)}
          </div>
          <div>
            <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--color-text);">بدء جلسة مذاكرة سريعة</h4>
            <p style="font-size: 12px; color: var(--color-text-secondary); margin: 2px 0 0 0;">اختر مادة وابدأ تتبع وقت التركيز والانجاز فوراً</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; flex-grow: 1; justify-content: flex-end;">
          <select id="quick-course-select" class="form-control" style="max-width: 220px; min-height: 38px; font-size: 13px;">
            ${courseOptions}
          </select>
          
          <select id="quick-duration-select" class="form-control" style="min-width: 185px; max-width: 220px; min-height: 38px; font-size: 13px;">
            <option value="25">25 دقيقة (بومودورو)</option>
            <option value="45" selected>45 دقيقة (جلسة قياسية)</option>
            <option value="60">60 دقيقة (ساعة كاملة)</option>
            <option value="90">90 دقيقة (جلسة عميقة)</option>
            <option value="0">جلسة مفتوحة</option>
          </select>

          <button type="button" class="btn-primary" id="btn-quick-start-session" style="min-height: 38px; padding-inline: 16px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            ${icons.play(14)}
            <span>انطلاق</span>
          </button>
        </div>
      `;

      const courseSelect = quickCard.querySelector('#quick-course-select');
      const durationSelect = quickCard.querySelector('#quick-duration-select');
      const startBtn = quickCard.querySelector('#btn-quick-start-session');

      startBtn.addEventListener('click', async () => {
        const selectedCourseId = courseSelect.value;
        if (!selectedCourseId) {
          showToast('يرجى اختيار المساق الدراسي لبدء الجلسة', 'warning');
          return;
        }

        const selectedCourse = courses.find((c) => c.id === selectedCourseId);
        const durationMinutes = Number(durationSelect.value) || 0;

        startBtn.disabled = true;
        startBtn.innerHTML = `<span>جاري البدء...</span>`;

        const { session, error } = await startNewGlobalSession({
          courseId: selectedCourseId,
          courseTitle: selectedCourse?.title || '',
          topicId: selectedCourse?.current_position_topic_id || null,
          topicTitle: selectedCourse?.current_position_topic_title || 'مذاكرة عامة',
          durationMinutes,
        });

        startBtn.disabled = false;
        startBtn.innerHTML = `${icons.play(14)}<span>انطلاق</span>`;

        if (error) {
          showToast(error.message || 'حدث خطأ أثناء بدء الجلسة', 'error');
        } else {
          showToast('تم إطلاق جلسة المذاكرة بنجاح!', 'success');
          renderContent(session);
          if (onSessionUpdate) onSessionUpdate(session);
        }
      });

      wrapper.appendChild(quickCard);
    }
  }

  const initialSession = getActiveSession() || activeSession;
  renderContent(initialSession);

  // الاستماع للتغيرات الجلسة من sessionManager
  const unsubscribe = subscribeToSession(({ session, event }) => {
    if (event === 'started' || event === 'restored') {
      renderContent(session);
    } else if (event === 'completed' || event === 'cancelled') {
      renderContent(null);
    }
    if (onSessionUpdate) onSessionUpdate(session);
  });

  container.appendChild(wrapper);

  return () => {
    unsubscribe();
  };
}
