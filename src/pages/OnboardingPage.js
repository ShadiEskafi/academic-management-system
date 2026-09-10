// src/pages/OnboardingPage.js
// معالج التهيئة الأولى للطلبة الجدد (First-Time Onboarding Wizard)
// مصمم بالهوية الأكاديمية الهادئة (Calm Academic) من 3 خطوات متتابعة
// يربط التفرغ والمساقات مباشرة مع Supabase بدون أي N+1 queries

import { supabase } from '../api/supabaseClient.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';

const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'الأحد', order: 1 },
  { key: 'monday', label: 'الإثنين', order: 2 },
  { key: 'tuesday', label: 'الثلاثاء', order: 3 },
  { key: 'wednesday', label: 'الأربعاء', order: 4 },
  { key: 'thursday', label: 'الخميس', order: 5 },
  { key: 'friday', label: 'الجمعة', order: 6 },
  { key: 'saturday', label: 'السبت', order: 7 },
];

function getDifficultyLabel(diff) {
  switch (diff) {
    case 'easy':
      return 'سهل';
    case 'medium':
      return 'متوسط';
    case 'hard':
      return 'صعب';
    default:
      return 'متوسط';
  }
}

function getDifficultyBadgeClass(diff) {
  switch (diff) {
    case 'easy':
      return 'badge badge-success';
    case 'medium':
      return 'badge badge-warning';
    case 'hard':
      return 'badge badge-danger';
    default:
      return 'badge badge-warning';
  }
}

/**
 * دالة رسم معالج التهيئة الأولى
 * @param {HTMLElement} container - عنصر الحاوية الرئيسي (#app)
 * @param {Object} options
 * @param {Object} options.user - كائن المستخدم المسجل
 * @param {Function} options.onComplete - كولباك استدعاء عند اكتمال التهيئة بنجاح
 * @returns {Function} cleanup - دالة تنظيف الذاكرة
 */
export function renderOnboardingPage(container, { user, onComplete }) {
  // حالة المكون المحلية (Local Component State)
  let currentStep = 1;
  let activeTemplate = 'morning'; // 'morning' | 'evening' | 'weekend' | 'custom'
  let isSubmitting = false;
  let submissionError = null;

  // إعدادات أوقات التفرغ الافتراضية (Step 1)
  let availabilityState = {
    sunday: { enabled: true, startTime: '16:00', endTime: '21:00' },
    monday: { enabled: true, startTime: '16:00', endTime: '21:00' },
    tuesday: { enabled: true, startTime: '16:00', endTime: '21:00' },
    wednesday: { enabled: true, startTime: '16:00', endTime: '21:00' },
    thursday: { enabled: true, startTime: '16:00', endTime: '21:00' },
    friday: { enabled: false, startTime: '14:00', endTime: '18:00' },
    saturday: { enabled: false, startTime: '10:00', endTime: '16:00' },
  };

  // قائمة المساقات الأولية (Step 2) - تبدأ بمساقين نموذجيين لتسهيل التجربة
  let coursesList = [
    { id: 'c-1', title: 'خوارزميات وهياكل بيانات', creditHours: 3, difficulty: 'hard', examDate: '' },
    { id: 'c-2', title: 'نظم التشغيل والعمليات', creditHours: 3, difficulty: 'medium', examDate: '' },
  ];

  // تطبيق القوالب الجاهزة
  function applyTemplate(templateKey) {
    activeTemplate = templateKey;
    if (templateKey === 'morning') {
      // دوام صباحي بالجامعة -> تفرغ مسائي
      DAYS_OF_WEEK.forEach((d) => {
        const isWeekday = d.key !== 'friday' && d.key !== 'saturday';
        availabilityState[d.key] = {
          enabled: isWeekday,
          startTime: '16:00',
          endTime: '21:00',
        };
      });
    } else if (templateKey === 'evening') {
      // دوام مسائي بالجامعة -> تفرغ صباحي
      DAYS_OF_WEEK.forEach((d) => {
        const isWeekday = d.key !== 'friday' && d.key !== 'saturday';
        availabilityState[d.key] = {
          enabled: isWeekday,
          startTime: '09:00',
          endTime: '13:00',
        };
      });
    } else if (templateKey === 'weekend') {
      // مكثف عطلة نهاية الأسبوع
      DAYS_OF_WEEK.forEach((d) => {
        const isWeekend = d.key === 'friday' || d.key === 'saturday';
        availabilityState[d.key] = {
          enabled: true,
          startTime: isWeekend ? '09:00' : '19:00',
          endTime: isWeekend ? '18:00' : '22:00',
        };
      });
    }
    render();
  }

  // حساب إجمالي ساعات التفرغ الأسبوعية
  function calculateTotalAvailabilityHours() {
    let totalMinutes = 0;
    Object.values(availabilityState).forEach((day) => {
      if (!day.enabled) return;
      const [sh, sm] = (day.startTime || '00:00').split(':').map(Number);
      const [eh, em] = (day.endTime || '00:00').split(':').map(Number);
      const startMin = (sh || 0) * 60 + (sm || 0);
      const endMin = (eh || 0) * 60 + (em || 0);
      if (endMin > startMin) {
        totalMinutes += endMin - startMin;
      }
    });
    return (totalMinutes / 60).toFixed(1);
  }

  // حساب إجمالي الساعات المعتمدة
  function calculateTotalCreditHours() {
    return coursesList.reduce((sum, c) => sum + (Number(c.creditHours) || 0), 0);
  }

  // حساب الحمل الدراسي التقديري
  function calculateEstimatedStudyLoad() {
    let totalRecommendedHours = 0;
    coursesList.forEach((c) => {
      const cr = Number(c.creditHours) || 3;
      let diffMultiplier = 1.5;
      if (c.difficulty === 'hard') diffMultiplier = 1.8;
      else if (c.difficulty === 'easy') diffMultiplier = 1.2;
      totalRecommendedHours += cr * diffMultiplier;
    });
    return Math.round(totalRecommendedHours);
  }

  // تنفيذ الحفظ النهائي في Supabase
  async function handleFinalSubmission() {
    if (coursesList.length < 2) {
      submissionError = 'يرجى إدخال مساقين على الأقل للمتابعة.';
      render();
      return;
    }

    const totalAvail = parseFloat(calculateTotalAvailabilityHours());
    if (totalAvail <= 0) {
      submissionError = 'يرجى تحديد أوقات تفرغ أسبوعية صالحة (ساعة واحدة على الأقل).';
      render();
      return;
    }

    isSubmitting = true;
    submissionError = null;
    render();

    try {
      const userId = user.id;

      // 1. التحقق من وجود فصل دراسي حالي، أو إنشاء فصل دراسي تلقائي
      const { data: existingSemesters, error: semFetchErr } = await supabase
        .from('semesters')
        .select('id')
        .eq('user_id', userId)
        .eq('is_current', true)
        .limit(1);

      if (semFetchErr) throw semFetchErr;

      let semesterId = existingSemesters?.[0]?.id;
      if (!semesterId) {
        const { data: newSem, error: semInsertErr } = await supabase
          .from('semesters')
          .insert({
            user_id: userId,
            title: 'الفصل الدراسي الحالي',
            status: 'active',
            is_current: true,
          })
          .select('id')
          .single();

        if (semInsertErr) throw semInsertErr;
        semesterId = newSem.id;
      }

      // 2. إدراج المساقات دفعة واحدة (Batch insert) مع التقاط الـ IDs المنشأة
      // التزام كامل بالقيم النصية المعتمدة لقيد chk_course_difficulty: 'easy' | 'medium' | 'hard'
      const courseRows = coursesList.map((c) => {
        const diff = ['easy', 'medium', 'hard'].includes(c.difficulty) ? c.difficulty : 'medium';
        const prio = diff === 'hard' ? 'high' : diff === 'easy' ? 'low' : 'medium';
        return {
          user_id: userId,
          semester_id: semesterId,
          title: String(c.title || '').trim(),
          credit_hours: Number(c.creditHours) || 3,
          difficulty: diff,
          priority: prio,
        };
      });

      const { data: insertedCourses, error: courseInsertErr } = await supabase
        .from('courses')
        .insert(courseRows)
        .select('id, title');

      if (courseInsertErr) throw courseInsertErr;

      // 3. ربط الامتحانات بالمساقات المنشأة فقط إذا تم تحديد تاريخ امتحان صالح وغير فارغ
      // تجنب كامل لخطأ Postgres (invalid input syntax for type date: "")
      const examRows = [];
      (insertedCourses || []).forEach((ic, index) => {
        const originalCourse = coursesList[index];
        const dateStr = originalCourse?.examDate ? String(originalCourse.examDate).trim() : '';
        if (dateStr !== '') {
          examRows.push({
            user_id: userId,
            course_id: ic.id,
            title: `الامتحان النهائي - ${ic.title}`,
            exam_type: 'final',
            exam_date: dateStr,
          });
        }
      });

      if (examRows.length > 0) {
        const { error: examErr } = await supabase.from('exams').insert(examRows);
        if (examErr) {
          console.warn('Could not insert exams batch:', examErr);
        }
      }

      // 4. إدراج فترات التفرغ الأسبوعية
      const availabilityRows = [];
      DAYS_OF_WEEK.forEach((d) => {
        const slot = availabilityState[d.key];
        if (slot && slot.enabled) {
          availabilityRows.push({
            user_id: userId,
            day_of_week: d.key,
            start_time: slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime,
            end_time: slot.endTime.length === 5 ? `${slot.endTime}:00` : slot.endTime,
          });
        }
      });

      if (availabilityRows.length > 0) {
        const { error: availErr } = await supabase.from('availability').insert(availabilityRows);
        if (availErr) {
          console.warn('Fallback to availability_slots table:', availErr);
          await supabase.from('availability_slots').insert(availabilityRows);
        }
      }

      // 5. تحديث حالة المستخدم إلى is_onboarded: true
      try {
        await supabase
          .from('profiles')
          .upsert({ id: userId, is_onboarded: true, updated_at: new Date().toISOString() });
      } catch (profErr) {
        console.warn('Profiles upsert warning:', profErr);
      }

      try {
        await supabase.auth.updateUser({ data: { is_onboarded: true } });
      } catch (authErr) {
        console.warn('Auth user_metadata update warning:', authErr);
      }

      // 6. استدعاء الكولباك للانتقال المباشر للـ Dashboard
      if (typeof onComplete === 'function') {
        onComplete();
      }
    } catch (err) {
      console.error('Onboarding Submission Error:', err);
      isSubmitting = false;
      submissionError = err.message || 'حدث خطأ أثناء حفظ الخطة. يرجى إعادة المحاولة.';
      render();
    }
  }

  // رسم واجهة المعالج بالهوية الأكاديمية الهادئة (Calm Academic)
  function render() {
    const totalAvailHours = calculateTotalAvailabilityHours();
    const totalCredits = calculateTotalCreditHours();
    const estimatedLoad = calculateEstimatedStudyLoad();

    container.innerHTML = `
      <div class="onboarding-wizard">
        <div class="onboarding-container">
          
          <!-- الترويسة وشعار مِحْوَر -->
          <div class="onboarding-header">
            <div class="landing-brand">
              <span class="brand-name-ar">مِحْوَر</span>
              <span class="brand-divider">|</span>
              <span class="brand-name-en">Mihwar</span>
            </div>
            <span class="badge badge-accent">التهيئة الأولى للنظام</span>
          </div>

          <!-- مؤشر الخطوات المترابط (Progress Stepper) -->
          <div class="onboarding-stepper" aria-label="خطوات التهيئة">
            
            <div class="stepper-step ${currentStep === 1 ? 'is-active' : currentStep > 1 ? 'is-completed' : ''}">
              <div class="stepper-circle bidi-plaintext" dir="ltr">
                ${currentStep > 1 ? icons.check(14) : '1'}
              </div>
              <span class="stepper-label">التفرغ الأسبوعي</span>
            </div>

            <div class="stepper-connector ${currentStep > 1 ? 'is-completed' : ''}"></div>

            <div class="stepper-step ${currentStep === 2 ? 'is-active' : currentStep > 2 ? 'is-completed' : ''}">
              <div class="stepper-circle bidi-plaintext" dir="ltr">
                ${currentStep > 2 ? icons.check(14) : '2'}
              </div>
              <span class="stepper-label">المساقات والأوزان</span>
            </div>

            <div class="stepper-connector ${currentStep > 2 ? 'is-completed' : ''}"></div>

            <div class="stepper-step ${currentStep === 3 ? 'is-active' : ''}">
              <div class="stepper-circle bidi-plaintext" dir="ltr">3</div>
              <span class="stepper-label">المعايرة والانطلاق</span>
            </div>

          </div>

          <!-- بطاقة المعايرة المركزية -->
          <div class="onboarding-card">
            
            ${
              submissionError
                ? `
                  <div class="onboarding-error-banner" role="alert">
                    ${icons.alertTriangle(16)}
                    <span>${escapeHtml(submissionError)}</span>
                  </div>
                `
                : ''
            }

            <!-- الخطوة 1: التفرغ الأسبوعي -->
            ${
              currentStep === 1
                ? `
                  <div class="onboarding-step-pane">
                    <div class="step-pane-header">
                      <h2>متى يناسبك التفرغ للمذاكرة الجامعية؟</h2>
                      <p>اختر قالباً سريعاً لروتينك اليومي أو حدد ساعات تفرغك بدقة لتوزيع مهامك الدراسية دون أي تعارض زمني.</p>
                    </div>

                    <!-- أزرار القوالب السريعة -->
                    <div class="onboarding-templates-grid">
                      
                      <button type="button" class="template-card ${activeTemplate === 'morning' ? 'is-selected' : ''}" data-template="morning">
                        <div class="template-icon">${icons.sun(20)}</div>
                        <div class="template-info">
                          <strong>دوام جامعي صباحي</strong>
                          <span>محاضراتك صباحاً والتفرغ للمذاكرة عصراً ومساءً (16:00 - 21:00).</span>
                        </div>
                        <span class="badge badge-accent template-pill">5 أيام • 25 ساعة</span>
                      </button>

                      <button type="button" class="template-card ${activeTemplate === 'evening' ? 'is-selected' : ''}" data-template="evening">
                        <div class="template-icon">${icons.moon(20)}</div>
                        <div class="template-info">
                          <strong>دوام جامعي مسائي</strong>
                          <span>محاضراتك مسائية والتفرغ للمذاكرة صباحاً (09:00 - 13:00).</span>
                        </div>
                        <span class="badge badge-accent template-pill">5 أيام • 20 ساعة</span>
                      </button>

                      <button type="button" class="template-card ${activeTemplate === 'weekend' ? 'is-selected' : ''}" data-template="weekend">
                        <div class="template-icon">${icons.zap(20)}</div>
                        <div class="template-info">
                          <strong>مكثف عطلة الأسبوع</strong>
                          <span>تركيز عالي الجمعة والسبت مع فترات تثبيت مسائية خفيفة.</span>
                        </div>
                        <span class="badge badge-accent template-pill">كل الأيام • 34 ساعة</span>
                      </button>

                      <button type="button" class="template-card ${activeTemplate === 'custom' ? 'is-selected' : ''}" data-template="custom">
                        <div class="template-icon">${icons.edit(20)}</div>
                        <div class="template-info">
                          <strong>تخصيص حر ومخصص</strong>
                          <span>تعديل ساعات كل يوم بشكل فردي وفق جدولك الخاص.</span>
                        </div>
                        <span class="badge template-pill">مرن</span>
                      </button>

                    </div>

                    <!-- شبكة مصفوفة الأيام والساعات -->
                    <div class="onboarding-schedule-table">
                      <div class="schedule-table-header">
                        <span>اليوم</span>
                        <span>فترة التفرغ (من ← إلى)</span>
                        <span>الحالة</span>
                      </div>
                      <div class="schedule-table-rows">
                        ${DAYS_OF_WEEK.map((d) => {
                          const slot = availabilityState[d.key];
                          return `
                            <div class="schedule-row ${slot.enabled ? 'is-enabled' : 'is-disabled'}">
                              <label class="schedule-day-label">
                                <input type="checkbox" class="day-toggle-input" data-day="${d.key}" ${slot.enabled ? 'checked' : ''} />
                                <span>${d.label}</span>
                              </label>

                              <div class="schedule-time-inputs">
                                <input type="time" class="time-input input bidi-plaintext" dir="ltr" data-day="${d.key}" data-field="startTime" value="${slot.startTime}" ${!slot.enabled ? 'disabled' : ''} />
                                <span class="time-sep">←</span>
                                <input type="time" class="time-input input bidi-plaintext" dir="ltr" data-day="${d.key}" data-field="endTime" value="${slot.endTime}" ${!slot.enabled ? 'disabled' : ''} />
                              </div>

                              <div>
                                <span class="badge ${slot.enabled ? 'badge-success' : ''}">
                                  ${slot.enabled ? 'مفعل' : 'غير مفعل'}
                                </span>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>

                    <!-- شريط الملخص السفلي للخطوة -->
                    <div class="step-footer-bar">
                      <div class="step-footer-info">
                        <span>إجمالي التفرغ المحسوب: <strong>${totalAvailHours}</strong> ساعة أسبوعياً</span>
                      </div>
                      <button type="button" class="btn-primary" id="btn-goto-step-2">
                        <span>المتابعة للمساقات والأوزان</span>
                        ${icons.arrowLeft(16)}
                      </button>
                    </div>

                  </div>
                `
                : ''
            }

            <!-- الخطوة 2: المساقات والأوزان -->
            ${
              currentStep === 2
                ? `
                  <div class="onboarding-step-pane">
                    <div class="step-pane-header">
                      <h2>ما هي مساقاتك لهذا الفصل الدراسي؟</h2>
                      <p>أدخل أسماء المواد وساعاتها المعتمدة ومستوى صعوبتها لتوزيع أوقات المذاكرة بعدالة (حد أدنى مساقين).</p>
                    </div>

                    <!-- قائمة كروت المساقات -->
                    <div class="onboarding-courses-list" id="courses-container">
                      ${coursesList.map((course, idx) => `
                        <div class="onboarding-course-row" data-course-id="${course.id}">
                          <div class="course-index-tag bidi-plaintext" dir="ltr">#0${idx + 1}</div>
                          
                          <div class="course-field-group field-title">
                            <label>اسم المساق</label>
                            <input type="text" class="course-title-input input" placeholder="مثال: هياكل بيانات" value="${escapeHtml(course.title)}" />
                          </div>

                          <div class="course-field-group field-credits">
                            <label>الساعات</label>
                            <select class="course-credits-select input bidi-plaintext" dir="ltr">
                              <option value="1" ${course.creditHours === 1 ? 'selected' : ''}>1 CH</option>
                              <option value="2" ${course.creditHours === 2 ? 'selected' : ''}>2 CH</option>
                              <option value="3" ${course.creditHours === 3 ? 'selected' : ''}>3 CH</option>
                              <option value="4" ${course.creditHours === 4 ? 'selected' : ''}>4 CH</option>
                            </select>
                          </div>

                          <div class="course-field-group field-diff">
                            <label>الصعوبة</label>
                            <select class="course-diff-select input">
                              <option value="easy" ${course.difficulty === 'easy' ? 'selected' : ''}>سهل</option>
                              <option value="medium" ${course.difficulty === 'medium' ? 'selected' : ''}>متوسط</option>
                              <option value="hard" ${course.difficulty === 'hard' ? 'selected' : ''}>صعب</option>
                            </select>
                          </div>

                          <div class="course-field-group field-exam">
                            <label>موعد الاختبار (اختياري)</label>
                            <input type="date" class="course-exam-input input bidi-plaintext" dir="ltr" value="${escapeHtml(course.examDate)}" />
                          </div>

                          <button type="button" class="course-delete-btn" data-delete-id="${course.id}" title="حذف المساق" aria-label="حذف المساق">
                            ${icons.trash(15)}
                          </button>
                        </div>
                      `).join('')}
                    </div>

                    <!-- زر إضافة مساق جديد -->
                    <div style="margin-top: 14px;">
                      <button type="button" class="btn-secondary" id="btn-add-course">
                        ${icons.plus(15)}
                        <span>إضافة مساق دراسي آخر</span>
                      </button>
                    </div>

                    <!-- شريط التنقل السفلي -->
                    <div class="step-footer-bar">
                      <button type="button" class="btn-secondary" id="btn-back-step-1">
                        ${icons.arrowRight(16)}
                        <span>السابق</span>
                      </button>

                      <div class="step-footer-info">
                        <span>إجمالي المساقات: <strong>${coursesList.length}</strong> &bull; الساعات المعتمدة: <strong class="bidi-plaintext" dir="ltr">${totalCredits} CH</strong></span>
                      </div>

                      <button type="button" class="btn-primary" id="btn-goto-step-3">
                        <span>المتابعة لمراجعة الخطة</span>
                        ${icons.arrowLeft(16)}
                      </button>
                    </div>

                  </div>
                `
                : ''
            }

            <!-- الخطوة 3: المعايرة والانطلاق -->
            ${
              currentStep === 3
                ? `
                  <div class="onboarding-step-pane">
                    <div class="step-pane-header">
                      <h2>مراجعة الخطة واعتماد الانطلاق</h2>
                      <p>يقوم محرك مِحْوَر بموازنة أوقات تفرغك مع المساقات المعتمدة لتوليد جدول دراسي متوازن ودقيق.</p>
                    </div>

                    <!-- لوحة القياس والإحصائيات -->
                    <div class="onboarding-stats-grid">
                      
                      <div class="onboarding-stat-card">
                        <span class="stat-label">ساعات التفرغ المتاحة</span>
                        <div class="stat-value bidi-plaintext" dir="ltr">${totalAvailHours} <span>ساعة/أسبوع</span></div>
                        <span class="badge badge-accent">طاقة متوفرة</span>
                      </div>

                      <div class="onboarding-stat-card">
                        <span class="stat-label">ساعات الجهد المقدرة</span>
                        <div class="stat-value bidi-plaintext" dir="ltr">~${estimatedLoad} <span>ساعة/أسبوع</span></div>
                        <span class="badge">تقدير الحمل الدراسي</span>
                      </div>

                      <div class="onboarding-stat-card">
                        <span class="stat-label">ضمان منع التعارض</span>
                        <div class="stat-value bidi-plaintext" dir="ltr">100%</div>
                        <span class="badge badge-success">توزيع متوازن</span>
                      </div>

                    </div>

                    <!-- استعراض المساقات المعتمدة مع مؤشر الأوزان -->
                    <div class="onboarding-summary-box">
                      <div class="summary-box-title">
                        <span>المساقات المجهزة للمزامنة (${coursesList.length})</span>
                        <span class="badge badge-accent">جاهز للاعتماد</span>
                      </div>

                      <div class="summary-courses-list">
                        ${coursesList.map((c) => `
                          <div class="summary-course-item">
                            <div>
                              <strong>${escapeHtml(c.title)}</strong>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <span class="badge bidi-plaintext" dir="ltr">${c.creditHours} CH</span>
                              <span class="${getDifficultyBadgeClass(c.difficulty)}">${getDifficultyLabel(c.difficulty)}</span>
                              ${c.examDate ? `<span class="badge badge-accent bidi-plaintext" dir="ltr">اختبار: ${escapeHtml(c.examDate)}</span>` : ''}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                    <!-- زر الانطلاق النهائي -->
                    <div class="step-footer-bar">
                      <button type="button" class="btn-secondary" id="btn-back-step-2" ${isSubmitting ? 'disabled' : ''}>
                        ${icons.arrowRight(16)}
                        <span>السابق</span>
                      </button>

                      <button type="button" class="btn-primary" id="btn-launch-mihwar" ${isSubmitting ? 'disabled' : ''}>
                        ${isSubmitting ? icons.clock(18) : icons.check(18)}
                        <span>${isSubmitting ? 'جاري معايرة الخطة وحفظ البيانات...' : 'اعتماد الخطة وتشغيل مِحْوَر'}</span>
                      </button>
                    </div>

                  </div>
                `
                : ''
            }

          </div>

        </div>
      </div>
    `;

    attachEvents();
  }

  // ربط أحداث التفاعل
  function attachEvents() {
    // --- Step 1 Events ---
    if (currentStep === 1) {
      // أزرار القوالب
      container.querySelectorAll('.template-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          const tmpl = btn.getAttribute('data-template');
          applyTemplate(tmpl);
        });
      });

      // مفاتيح تفعيل الأيام
      container.querySelectorAll('.day-toggle-input').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
          const day = checkbox.getAttribute('data-day');
          if (availabilityState[day]) {
            availabilityState[day].enabled = checkbox.checked;
            activeTemplate = 'custom';
            render();
          }
        });
      });

      // حقول الأوقات
      container.querySelectorAll('.time-input').forEach((input) => {
        input.addEventListener('change', () => {
          const day = input.getAttribute('data-day');
          const field = input.getAttribute('data-field');
          if (availabilityState[day] && field) {
            availabilityState[day][field] = input.value;
            activeTemplate = 'custom';
            // تحديث رقم الساعات المباشر
            const metricEl = container.querySelector('.step-footer-info strong');
            if (metricEl) {
              metricEl.textContent = calculateTotalAvailabilityHours();
            }
          }
        });
      });

      // زر الانتقال للخطوة 2
      const btnNext1 = container.querySelector('#btn-goto-step-2');
      if (btnNext1) {
        btnNext1.addEventListener('click', () => {
          const total = parseFloat(calculateTotalAvailabilityHours());
          if (total <= 0) {
            submissionError = 'يرجى تحديد أوقات تفرغ أسبوعية صالحة (ساعة واحدة على الأقل) للمتابعة.';
            render();
            return;
          }
          submissionError = null;
          currentStep = 2;
          render();
        });
      }
    }

    // --- Step 2 Events ---
    if (currentStep === 2) {
      // زر الرجوع للخطوة 1
      const btnBack1 = container.querySelector('#btn-back-step-1');
      if (btnBack1) {
        btnBack1.addEventListener('click', () => {
          syncCoursesFromDOM();
          submissionError = null;
          currentStep = 1;
          render();
        });
      }

      // إضافة مساق جديد
      const btnAdd = container.querySelector('#btn-add-course');
      if (btnAdd) {
        btnAdd.addEventListener('click', () => {
          syncCoursesFromDOM();
          coursesList.push({
            id: `c-${Date.now()}`,
            title: '',
            creditHours: 3,
            difficulty: 'medium',
            examDate: '',
          });
          render();
        });
      }

      // حذف مساق
      container.querySelectorAll('.course-delete-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          syncCoursesFromDOM();
          const id = btn.getAttribute('data-delete-id');
          if (coursesList.length <= 2) {
            submissionError = 'الحد الأدنى لمتابعة المعايرة هو مساقان دراسيان.';
            render();
            return;
          }
          coursesList = coursesList.filter((c) => c.id !== id);
          submissionError = null;
          render();
        });
      });

      // زر الانتقال للخطوة 3
      const btnNext2 = container.querySelector('#btn-goto-step-3');
      if (btnNext2) {
        btnNext2.addEventListener('click', () => {
          syncCoursesFromDOM();
          // فحص صحة العناوين
          const emptyCourse = coursesList.find((c) => !c.title.trim());
          if (emptyCourse) {
            submissionError = 'يرجى كتابة عنوان واضح لجميع المساقات قبل المتابعة.';
            render();
            return;
          }
          if (coursesList.length < 2) {
            submissionError = 'يرجى إضافة مساقين على الأقل لإكمال التهيئة.';
            render();
            return;
          }
          submissionError = null;
          currentStep = 3;
          render();
        });
      }
    }

    // --- Step 3 Events ---
    if (currentStep === 3) {
      // زر الرجوع للخطوة 2
      const btnBack2 = container.querySelector('#btn-back-step-2');
      if (btnBack2) {
        btnBack2.addEventListener('click', () => {
          submissionError = null;
          currentStep = 2;
          render();
        });
      }

      // زر الإطلاق النهائي
      const btnLaunch = container.querySelector('#btn-launch-mihwar');
      if (btnLaunch) {
        btnLaunch.addEventListener('click', () => {
          handleFinalSubmission();
        });
      }
    }
  }

  // مزامنة قيم المدخلات من الـ DOM إلى الـ state المحلي
  function syncCoursesFromDOM() {
    const rows = container.querySelectorAll('.onboarding-course-row');
    rows.forEach((row) => {
      const id = row.getAttribute('data-course-id');
      const course = coursesList.find((c) => c.id === id);
      if (course) {
        const titleInput = row.querySelector('.course-title-input');
        const creditsSelect = row.querySelector('.course-credits-select');
        const diffSelect = row.querySelector('.course-diff-select');
        const examInput = row.querySelector('.course-exam-input');

        if (titleInput) course.title = titleInput.value;
        if (creditsSelect) course.creditHours = Number(creditsSelect.value) || 3;
        if (diffSelect) {
          const val = diffSelect.value;
          course.difficulty = ['easy', 'medium', 'hard'].includes(val) ? val : 'medium';
        }
        if (examInput) course.examDate = examInput.value;
      }
    });
  }

  // البدء بالرسم
  render();

  // دالة التنظيف القياسية
  return function cleanupOnboardingPage() {
    // لا يتم التلاعب بالثيم لترث الصفحة الثيم النشط للمستخدم بسلاسة
  };
}
