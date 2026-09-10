// src/pages/WeeklyPlannerPage.js
// الشاشة الرئيسية لمحرك التخطيط والتقويم الأسبوعي (Phase 4 Weekly Planner Page)

import { fetchPlannerData, saveWeeklyPlan, deletePlannerSession } from '../api/planner.js';
import { generateWeeklyPlanAlgorithm, getLocalWeekStartDate, INDEX_TO_DAY } from '../utils/studyPlanner.js';
import { renderSessionCard } from '../components/planner/SessionCard.js';
import { renderManualSessionModal } from '../components/planner/ManualSessionModal.js';
import { skeletons } from '../utils/skeletons.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showToast } from '../utils/toast.js';
import { navigate } from '../state/router.js';

export async function renderWeeklyPlannerPage(container) {
  let currentWeekStart = getLocalWeekStartDate(new Date());

  // رندرة Skeleton فوري للشاشة كحالة تحميل مؤقتة
  container.innerHTML = `
    <div class="page-container planner-page">
      <header style="margin-bottom: var(--space-6);">
        <div style="width: 280px; height: 32px; background: var(--color-bg-secondary); border-radius: 6px; margin-bottom: 8px;"></div>
        <div style="width: 400px; height: 18px; background: var(--color-bg-secondary); border-radius: 4px;"></div>
      </header>

      <section style="margin-bottom: var(--space-6);">
        ${skeletons.cards(1)}
      </section>

      <section>
        ${skeletons.cards(3)}
      </section>
    </div>
  `;

  async function loadAndRender() {
    const plannerData = await fetchPlannerData(currentWeekStart);

    if (plannerData.error) {
      container.innerHTML = `
        <div class="page-container">
          <div class="card error-state">
            <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
            <h3>تعذر تحميل جدول المذاكرة</h3>
            <p>${escapeHtml(plannerData.error.message)}</p>
          </div>
        </div>
      `;
      return () => {};
    }

    const {
      currentSemester,
      courses = [],
      availabilitySlots = [],
      exams = [],
      assignments = [],
      existingSessions = [],
    } = plannerData;

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'page-container planner-page';

    // -------------------------------------------------------------
    // 1. الترويسة وأدوات التحكم في الأسابيع
    // -------------------------------------------------------------
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatWeekDate = (d) =>
      d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

    const header = document.createElement('header');
    header.style.cssText = `
      margin-bottom: var(--space-6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
    `;

    header.innerHTML = `
      <div>
        <h1 style="font-size: 26px; font-weight: 800; color: var(--color-text); margin-bottom: 4px; display: flex; align-items: center; gap: 10px;">
          ${icons.calendar(28)}
          <span>جدول المذاكرة والتخطيط الأسبوعي</span>
        </h1>
        <p class="text-secondary" style="font-size: 14px; margin: 0;">
          جدولة ذكية تتكيف مع أوقات تفرغك وأولويات مساقاتك الأكاديمية.
        </p>
      </div>

      <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
        <!-- التنقل بين الأسابيع -->
        <div style="display: flex; align-items: center; gap: 4px; background: var(--color-bg-secondary); padding: 4px; border-radius: 10px;">
          <button type="button" class="btn-icon" id="btn-prev-week" title="الأسبوع السابق">${icons.arrowRight(16)}</button>
          <span style="font-size: 13px; font-weight: 700; padding-inline: 8px; color: var(--color-text);">
            ${formatWeekDate(currentWeekStart)} - ${formatWeekDate(weekEnd)}
          </span>
          <button type="button" class="btn-icon" id="btn-next-week" title="الأسبوع القادم">${icons.arrowLeft(16)}</button>
        </div>

        <button type="button" class="btn-secondary" id="btn-manual-add" style="font-size: 13px; padding: 6px 14px; min-height: 38px; display: inline-flex; align-items: center; gap: 6px;">
          ${icons.plus(16)}
          <span>إضافة جلسة يدوية</span>
        </button>

        <button type="button" class="btn-primary" id="btn-generate-plan" style="font-size: 13px; padding: 6px 16px; min-height: 38px; display: inline-flex; align-items: center; gap: 6px;">
          ${icons.zap(16)}
          <span>توليد الخطة التلقائية</span>
        </button>
      </div>
    `;

    mainWrapper.appendChild(header);

    // -------------------------------------------------------------
    // 2. فحص توفر فصول ومواد وأوقات تفرغ
    // -------------------------------------------------------------
    if (!currentSemester) {
      const emptySem = document.createElement('div');
      emptySem.className = 'card';
      emptySem.style.cssText = `text-align: center; padding: var(--space-8); margin-bottom: var(--space-6);`;
      emptySem.innerHTML = `
        <div style="margin-bottom: var(--space-3); color: var(--color-primary);">${icons.academicCap(40)}</div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">لا يوجد فصل دراسي نشط حالياً</h3>
        <p class="text-secondary" style="font-size: 14px; max-width: 480px; margin: 0 auto 16px auto;">
          يتطلب جدول المذاكرة تعيين فصل دراسي نشط ومحتوى للمواد الدراسية لبدء الجدولة الذكية.
        </p>
        <button type="button" class="btn-primary" id="btn-go-semesters">الانتقال لإدارة الفصول</button>
      `;
      emptySem.querySelector('#btn-go-semesters')?.addEventListener('click', () => navigate('/semesters'));
      mainWrapper.appendChild(emptySem);
      container.innerHTML = '';
      container.appendChild(mainWrapper);
      return () => {};
    }

    if (availabilitySlots.length === 0) {
      const emptyAvail = document.createElement('div');
      emptyAvail.className = 'card';
      emptyAvail.style.cssText = `text-align: center; padding: var(--space-8); margin-bottom: var(--space-6); background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%);`;
      emptyAvail.innerHTML = `
        <div style="margin-bottom: var(--space-3); color: #f59e0b;">${icons.clock(40)}</div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">لم تعيّن أوقات تفرغك الأسبوعية بعد</h3>
        <p class="text-secondary" style="font-size: 14px; max-width: 500px; margin: 0 auto 16px auto;">
          تعتمد الخوارزمية الذكية على فترات تفرغك المحددة لتوزيع جلسات المذاكرة دون تعارض مع جدولك الشخصي.
        </p>
        <button type="button" class="btn-primary" id="btn-go-availability">إضافة أوقات التفرغ الآن</button>
      `;
      emptyAvail.querySelector('#btn-go-availability')?.addEventListener('click', () => navigate('/availability'));
      mainWrapper.appendChild(emptyAvail);
      container.innerHTML = '';
      container.appendChild(mainWrapper);
      return () => {};
    }

    // -------------------------------------------------------------
    // 3. شبكة التقويم الأسبوعي
    // -------------------------------------------------------------
    const calendarCard = document.createElement('div');
    calendarCard.className = 'card planner-calendar-card';
    calendarCard.style.cssText = `padding: var(--space-5); margin-bottom: var(--space-6); overflow-x: auto;`;

    const dayLabelsAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayObj = new Date();
    const todayDayIdx = todayObj.getDay();

    let gridHeadersHtml = '';
    let gridColumnsHtml = '';

    for (let i = 0; i < 7; i++) {
      const colDate = new Date(currentWeekStart);
      colDate.setDate(colDate.getDate() + i);

      const dayKey = INDEX_TO_DAY[i];
      const isToday =
        colDate.getDate() === todayObj.getDate() &&
        colDate.getMonth() === todayObj.getMonth() &&
        colDate.getFullYear() === todayObj.getFullYear();

      // تصفية الجلسات الخاصة بهذا اليوم
      const daySessions = existingSessions.filter((s) => {
        const sDate = new Date(s.scheduled_start);
        return (
          sDate.getDate() === colDate.getDate() &&
          sDate.getMonth() === colDate.getMonth() &&
          sDate.getFullYear() === colDate.getFullYear()
        );
      });

      gridHeadersHtml += `
        <div class="calendar-header-col ${isToday ? 'today-col' : ''}" style="
          text-align: center;
          padding: var(--space-3);
          background: ${isToday ? 'rgba(99, 102, 241, 0.12)' : 'var(--color-bg-secondary)'};
          border-radius: var(--radius-md);
          border: ${isToday ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'};
        ">
          <div style="font-size: 13px; font-weight: 700; color: ${isToday ? 'var(--color-primary)' : 'var(--color-text)'};">
            ${dayLabelsAr[i]}
          </div>
          <div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 2px;">
            ${colDate.getDate()} ${colDate.toLocaleDateString('ar-EG', { month: 'short' })}
          </div>
        </div>
      `;

      let sessionsCardsContainer = document.createElement('div');
      sessionsCardsContainer.className = `calendar-day-col ${isToday ? 'today-col' : ''}`;
      sessionsCardsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        min-height: 240px;
        padding: var(--space-2);
        background: ${isToday ? 'rgba(99, 102, 241, 0.02)' : 'transparent'};
        border-radius: var(--radius-md);
        border: 1px dashed var(--color-border);
      `;

      if (daySessions.length === 0) {
        sessionsCardsContainer.innerHTML = `
          <div style="text-align: center; padding: var(--space-6) var(--space-2); color: var(--color-text-secondary); font-size: 12px;">
            لا توجد جلسات
          </div>
        `;
      } else {
        daySessions.forEach((sess) => {
          const cardEl = renderSessionCard(sess, {
            onDeleteSession: async (sToDelete) => {
              const { error: delErr } = await deletePlannerSession(sToDelete.id);
              if (delErr) {
                showToast('تعذر حذف الجلسة', 'error');
              } else {
                showToast('تم حذف الجلسة المخططة', 'info');
                loadAndRender();
              }
            },
          });
          sessionsCardsContainer.appendChild(cardEl);
        });
      }

      gridColumnsHtml += sessionsCardsContainer.outerHTML;
    }

    calendarCard.innerHTML = `
      <div style="
        display: grid;
        grid-template-columns: repeat(7, minmax(130px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-3);
      ">
        ${gridHeadersHtml}
      </div>

      <div style="
        display: grid;
        grid-template-columns: repeat(7, minmax(130px, 1fr));
        gap: var(--space-3);
      ">
        ${gridColumnsHtml}
      </div>
    `;

    calendarCard.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-action="delete-session"]');
      if (deleteBtn) {
        e.stopPropagation();
        const sessionId = deleteBtn.dataset.sessionId;
        if (!sessionId) return;

        if (confirm('هل أنت متأكد من حذف هذه الجلسة المخططة؟')) {
          deleteBtn.disabled = true;
          const { error } = await deletePlannerSession(sessionId);
          if (error) {
            showToast('تعذر حذف الجلسة', 'error');
          } else {
            showToast('تم حذف الجلسة المخططة', 'info');
            loadAndRender();
          }
        }
        return;
      }
    });

    mainWrapper.appendChild(calendarCard);

    // -------------------------------------------------------------
    // 4. ربط الأحداث والأزرار
    // -------------------------------------------------------------
    header.querySelector('#btn-prev-week').addEventListener('click', () => {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      loadAndRender();
    });

    header.querySelector('#btn-next-week').addEventListener('click', () => {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      loadAndRender();
    });

    header.querySelector('#btn-manual-add').addEventListener('click', () => {
      renderManualSessionModal({
        courses,
        defaultDate: currentWeekStart,
        onSave: () => loadAndRender(),
      });
    });

    header.querySelector('#btn-generate-plan').addEventListener('click', async () => {
      const generateBtn = header.querySelector('#btn-generate-plan');
      generateBtn.disabled = true;
      generateBtn.innerHTML = `<span>جاري الجدولة الذكية...</span>`;

      showToast('جاري حساب الأولويات وتوليد الخطة الذكية...', 'info', 2000);

      const algoResult = generateWeeklyPlanAlgorithm({
        weekStartDate: currentWeekStart,
        availabilitySlots,
        courses,
        exams,
        assignments,
        existingSessions,
      });

      const { planId, savedCount, error: saveErr } = await saveWeeklyPlan({
        weekStartDateInput: currentWeekStart,
        planningMode: 'automatic',
        sessions: algoResult.plannedSessions,
      });

      generateBtn.disabled = false;
      generateBtn.innerHTML = `${icons.zap(16)} <span>توليد الخطة التلقائية</span>`;

      if (saveErr) {
        showToast(saveErr.message || 'حدث خطأ أثناء حفظ الخطة', 'error');
      } else {
        showToast(`تمت جدولة ${savedCount} جلسة مذاكرة بنجاح!`, 'success');
        loadAndRender();
      }
    });

    container.innerHTML = '';
    container.appendChild(mainWrapper);
    return () => {};
  }

  return loadAndRender();
}
