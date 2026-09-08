// src/pages/DashboardPage.js
// صفحة لوحة التحكم المركزية (Phase 3 Central Dashboard Page)

import { fetchDashboardData } from '../api/dashboard.js';
import { setCurrentSemester } from '../api/semesters.js';
import { renderEmptySemesterWidget } from '../components/dashboard/EmptySemesterWidget.js';
import { renderStatsSummaryWidget } from '../components/dashboard/StatsSummaryWidget.js';
import { renderActiveSessionWidget } from '../components/dashboard/ActiveSessionWidget.js';
import { renderUpcomingDeadlinesWidget } from '../components/dashboard/UpcomingDeadlinesWidget.js';
import { renderCourseProgressWidget } from '../components/dashboard/CourseProgressWidget.js';
import { renderWeeklyActivityWidget } from '../components/dashboard/WeeklyActivityWidget.js';
import { skeletons } from '../utils/skeletons.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from '../utils/toast.js';

export async function renderDashboardPage(container) {
  // -----------------------------------------------------------------
  // 1. رندرة Skeleton فوري للشاشة كحالة تحميل مؤقتة وفق الـ Design System
  // -----------------------------------------------------------------
  container.innerHTML = `
    <div class="page-container dashboard-page">
      <header style="margin-bottom: var(--space-6);">
        <div style="width: 240px; height: 32px; background: var(--color-bg-secondary); border-radius: 6px; margin-bottom: 8px;"></div>
        <div style="width: 380px; height: 18px; background: var(--color-bg-secondary); border-radius: 4px;"></div>
      </header>

      <section style="margin-bottom: var(--space-6);">
        ${skeletons.cards(1)}
      </section>

      <section style="margin-bottom: var(--space-6);">
        ${skeletons.cards(4)}
      </section>
    </div>
  `;

  // -----------------------------------------------------------------
  // 2. جلب البيانات عبر API المجمع الموحد O(1)
  // -----------------------------------------------------------------
  const dashboardData = await fetchDashboardData();

  if (dashboardData.error) {
    container.innerHTML = `
      <div class="page-container">
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل بيانات لوحة التحكم</h3>
          <p>${escapeHtml(dashboardData.error.message)}</p>
        </div>
      </div>
    `;
    return () => {};
  }

  // -----------------------------------------------------------------
  // 3. بناء الهيكل الكامل للوحة التحكم بعد اكتمال البيانات
  // -----------------------------------------------------------------
  const {
    hasActiveSemester,
    currentSemester,
    allSemesters = [],
    courses = [],
    activeSession = null,
    upcomingDeadlines = [],
    weeklyStats = {},
    overallStats = {},
  } = dashboardData;

  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'page-container dashboard-page';

  // الترويسة الرئيسية
  const header = document.createElement('header');
  header.style.cssText = `
    margin-bottom: var(--space-6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
  `;

  let semesterOptionsHtml = '';
  allSemesters.forEach((s) => {
    const isSelected = currentSemester && s.id === currentSemester.id;
    semesterOptionsHtml += `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(s.title)}</option>`;
  });

  header.innerHTML = `
    <div>
      <h1 style="font-size: 26px; font-weight: 800; color: var(--color-text); margin-bottom: 4px; display: flex; align-items: center; gap: 10px;">
        ${icons.layoutDashboard(28)}
        <span>لوحة التحكم المركزية</span>
      </h1>
      <p class="text-secondary" style="font-size: 14px; margin: 0;">
        مرحباً بك! نظرة عامة على أدائك الأكاديمي، جدول المذاكرة، والتكليفات القادمة.
      </p>
    </div>

    ${
      hasActiveSemester && allSemesters.length > 0
        ? `<div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 6px 14px; border-radius: 14px;">
            <span style="color: var(--color-primary); display: flex; align-items: center;">${icons.academicCap(18)}</span>
            <label for="dashboard-semester-select" style="font-size: 13px; font-weight: 600; color: var(--color-primary); margin: 0; white-space: nowrap;">الفصل الحالي:</label>
            <select id="dashboard-semester-select" class="form-control" style="font-size: 13px; font-weight: 700; padding: 4px 10px; min-height: 34px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-bg-card); color: var(--color-text); cursor: pointer; min-width: 160px;">
              ${semesterOptionsHtml}
            </select>
          </div>`
        : ''
    }
  `;

  // ربط الحدث عند تغيير الفصل الدراسي النشط من القائمة
  const semesterSelect = header.querySelector('#dashboard-semester-select');
  if (semesterSelect) {
    semesterSelect.addEventListener('change', async (e) => {
      const selectedId = e.target.value;
      if (!selectedId || (currentSemester && selectedId === currentSemester.id)) return;

      semesterSelect.disabled = true;
      showToast('جاري تبديل الفصل وتحديث البيانات...', 'info', 2000);

      const { error: switchErr } = await setCurrentSemester(selectedId);
      if (switchErr) {
        showToast('تعذر تغيير الفصل الحالي', 'error');
        semesterSelect.disabled = false;
      } else {
        showToast('تم تغيير الفصل الحالي بنجاح!', 'success');
        renderDashboardPage(container);
      }
    });
  }

  mainWrapper.appendChild(header);

  // -----------------------------------------------------------------
  // 4. حالة الفراغ: عدم توفر فصل نشط (Empty Semester State)
  // -----------------------------------------------------------------
  if (!hasActiveSemester) {
    renderEmptySemesterWidget(mainWrapper);
    container.innerHTML = '';
    container.appendChild(mainWrapper);
    return () => {};
  }

  // -----------------------------------------------------------------
  // 5. حالة توفر فصل نشط: رندرة الودجتس الـ 5 المعتمدة
  // -----------------------------------------------------------------

  // ودجت 1: الجلسة النشطة والبدء السريع
  const activeSessionContainer = document.createElement('div');
  const cleanupActiveSession = renderActiveSessionWidget(activeSessionContainer, {
    activeSession,
    courses,
    onSessionUpdate: (session) => {
      // عند التغير صراحة من الودجت
    },
  });
  mainWrapper.appendChild(activeSessionContainer);

  // ودجت 2: ملخص الإحصائيات المركزية الفائقة
  const statsContainer = document.createElement('div');
  renderStatsSummaryWidget(statsContainer, overallStats);
  mainWrapper.appendChild(statsContainer);

  // ودجت 3: التقدم في المواد الدراسية
  const coursesContainer = document.createElement('div');
  renderCourseProgressWidget(coursesContainer, {
    courses,
    semesterId: currentSemester.id,
  });
  mainWrapper.appendChild(coursesContainer);

  // ودجت 4 و 5: شبكة ثنائية الأعمدة للاستحقاقات والنشاط الأسبوعي
  const gridSection = document.createElement('div');
  gridSection.className = 'dashboard-main-grid';
  gridSection.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: var(--space-6);
    margin-bottom: var(--space-6);
  `;

  const deadlinesContainer = document.createElement('div');
  renderUpcomingDeadlinesWidget(deadlinesContainer, upcomingDeadlines);
  gridSection.appendChild(deadlinesContainer);

  const weeklyContainer = document.createElement('div');
  renderWeeklyActivityWidget(weeklyContainer, weeklyStats);
  gridSection.appendChild(weeklyContainer);

  mainWrapper.appendChild(gridSection);

  container.innerHTML = '';
  container.appendChild(mainWrapper);

  // الاستماع لحدث تحديث جلسة المذاكرة العام لتحديد شاشة لوحة التحكم تلقائياً
  const handleSessionUpdate = (e) => {
    if (e.detail?.event === 'completed' || e.detail?.event === 'cancelled') {
      renderDashboardPage(container);
    }
  };

  window.addEventListener('study-session-updated', handleSessionUpdate);

  // دالة Cleanup عند تغيير الشاشة
  return () => {
    window.removeEventListener('study-session-updated', handleSessionUpdate);
    if (typeof cleanupActiveSession === 'function') {
      cleanupActiveSession();
    }
  };
}
