// src/components/CourseForm.js
// شاشة وبطاقات المساقات وفق الـ Design System (Phase D)
import { icons } from '../utils/icons.js';

import { escapeHtml } from '../utils/sanitize.js';

export function renderCourseForm(
  container,
  {
    semesterTitle,
    courses = [],
    onCreate,
    onBack,
    onSelectCourse,
    onContinueCourse,
    onLogAchievement,
    onEditCourse,
    onDeleteCourse,
  }
) {
  container.innerHTML = `
    <div class="page-container">
      <nav style="margin-bottom:var(--space-4);">
        <button
          type="button"
          id="back-btn"
          class="btn-tertiary"
          style="display:inline-flex;align-items:center;gap:6px;padding:0;font-size:14px;color:var(--color-text-secondary);"
        >
          ${icons.arrowRight(16)}
          <span>العودة إلى الفصول الدراسية</span>
        </button>
      </nav>

      <header style="margin-bottom:var(--space-6);">
        <h1 style="margin-bottom:var(--space-1);">${escapeHtml(semesterTitle || 'المساقات الدراسية')}</h1>
        <p class="text-secondary" style="font-size:14px;">إدارة مساقات الفصل الدراسي، متابعة الإنجاز وموضع التوقف الحالي.</p>
      </header>

      <section class="card" style="margin-bottom:var(--space-6);">
        <h3 style="font-size:16px;margin-bottom:var(--space-3);display:flex;align-items:center;gap:8px;">
          ${icons.plus(16)}
          <span>إضافة مساق جديد</span>
        </h3>

        <form id="course-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
          <div class="field">
            <input
              type="text"
              name="title"
              class="input"
              placeholder="اسم المساق (مثال: تحليل وتصميم الخوارزميات)"
              required
              autocomplete="off"
            />
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:var(--space-3);">
            <div class="field">
              <input
                type="number"
                name="creditHours"
                class="input font-en"
                placeholder="الساعات المعتمدة (CH) *"
                min="1"
                required
              />
            </div>

            <div class="field">
              <select name="difficulty" class="input" required>
                <option value="" disabled selected>الصعوبة *</option>
                <option value="easy">سهل (Easy)</option>
                <option value="medium">متوسط (Medium)</option>
                <option value="hard">صعب (Hard)</option>
              </select>
            </div>

            <div class="field">
              <select name="priority" class="input">
                <option value="low">أولوية: منخفضة</option>
                <option value="medium" selected>أولوية: متوسطة</option>
                <option value="high">أولوية: مرتفعة</option>
              </select>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-1);">
            <p class="text-tertiary" style="font-size:12px;margin:0;">
              * الساعات المعتمدة ومستوى الصعوبة إجباريان لحساب أولوية الجدولة الذكية تلقائياً.
            </p>
            <button type="submit" class="btn-primary" style="flex-shrink:0;">
              ${icons.plus(16)}
              <span>إضافة المساق</span>
            </button>
          </div>
        </form>

        <p id="course-error" class="field-error" style="margin-top:var(--space-2);"></p>
      </section>

      <section>
        ${
          courses.length === 0
            ? `
            <div class="card empty-state">
              <div class="empty-state-icon" aria-hidden="true">${icons.book(32)}</div>
              <h3>لا توجد مساقات مضافة بعد</h3>
              <p>أضف أول مساق لهذا الفصل الدراسي لبناء شجرة المواضيع والاستحقاقات.</p>
            </div>
          `
            : `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:var(--space-4);">
              ${courses
                .map((c) => {
                  const currentTopic = c.current_position_topic_title;
                  return `
                    <article class="card card-level2 course-card" data-course-id="${c.id}" style="display:flex;flex-direction:column;justify-content:space-between;gap:var(--space-4);cursor:pointer;">
                      <div>
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-2);">
                          <h3 style="margin:0;font-size:17px;font-weight:600;color:var(--color-text);">
                            ${escapeHtml(c.title)}
                          </h3>

                          <div class="course-card-actions" style="display:flex;align-items:center;gap:4px;">
                            <button
                              type="button"
                              class="btn-icon edit-course-btn"
                              data-course-id="${c.id}"
                              title="تعديل المساق"
                              aria-label="تعديل المساق"
                            >
                              ${icons.edit(15)}
                            </button>
                            <button
                              type="button"
                              class="btn-icon delete-course-btn"
                              data-course-id="${c.id}"
                              title="حذف المساق"
                              aria-label="حذف المساق"
                              style="color:var(--color-danger);"
                            >
                              ${icons.trash(15)}
                            </button>
                          </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:var(--space-3);">
                          <span class="badge font-en">${c.credit_hours} CH</span>
                          <span class="${getDifficultyBadgeClass(c.difficulty)}">${getDifficultyLabel(c.difficulty)}</span>
                          <span class="badge">${getPriorityLabel(c.priority)}</span>
                        </div>

                        <div style="padding:var(--space-2) var(--space-3);background:var(--color-surface-soft);border:1px solid var(--color-border);border-radius:var(--radius-sm);">
                          <span class="text-tertiary" style="font-size:12px;display:block;margin-bottom:2px;">آخر موضع دراسة:</span>
                          <div style="font-size:13px;font-weight:500;color:${currentTopic ? 'var(--color-accent)' : 'var(--color-text-tertiary)'};">
                            ${currentTopic ? escapeHtml(currentTopic) : 'لا يوجد موضع مسجل حتى الآن'}
                          </div>
                        </div>
                      </div>

                      <div class="course-card-actions" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);padding-top:var(--space-3);border-top:1px solid var(--color-border);">
                        <button
                          type="button"
                          class="btn-tertiary log-achievement-btn"
                          data-course-id="${c.id}"
                          style="font-size:13px;"
                        >
                          ${icons.check(14)}
                          <span>سجّل إنجاز</span>
                        </button>

                        ${
                          c.current_position_topic_id
                            ? `
                            <button
                              type="button"
                              class="btn-primary continue-course-btn"
                              data-course-id="${c.id}"
                              data-topic-id="${c.current_position_topic_id}"
                              style="font-size:13px;padding-inline:12px;min-height:34px;"
                            >
                              <span>أكمل من هون</span>
                              ${icons.arrowLeft(14)}
                            </button>
                          `
                            : `
                            <button
                              type="button"
                              class="btn-secondary open-course-btn"
                              data-course-id="${c.id}"
                              style="font-size:13px;padding-inline:12px;min-height:34px;"
                            >
                              <span>فتح المساق</span>
                              ${icons.arrowLeft(14)}
                            </button>
                          `
                        }
                      </div>
                    </article>
                  `;
                })
                .join('')}
            </div>
          `
        }
      </section>
    </div>
  `;

  // الرجوع للخلف
  container.querySelector('#back-btn').addEventListener('click', () => onBack());

  // النقر على البطاقة لفتح تفاصيل المساق
  container.querySelectorAll('.course-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.course-card-actions')) return;
      const courseId = card.dataset.courseId;
      if (onSelectCourse) onSelectCourse(courseId);
    });
  });

  // النقر على زر فتح المساق الثانوي
  container.querySelectorAll('.open-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      if (onSelectCourse) onSelectCourse(courseId);
    });
  });

  // تعديل المساق
  container.querySelectorAll('.edit-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const course = courses.find((c) => c.id === courseId);
      if (course && onEditCourse) onEditCourse(course);
    });
  });

  // حذف المساق
  container.querySelectorAll('.delete-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const course = courses.find((c) => c.id === courseId);
      if (course && onDeleteCourse) onDeleteCourse(course);
    });
  });

  // أكمل من هون (الانتقال للـ Current Position)
  container.querySelectorAll('.continue-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const topicId = button.dataset.topicId;
      if (onContinueCourse) onContinueCourse(courseId, topicId);
    });
  });

  // تسجيل إنجاز
  container.querySelectorAll('.log-achievement-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      if (onLogAchievement) onLogAchievement(courseId);
    });
  });

  // إرسال استمارة إضافة المساق
  const form = container.querySelector('#course-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const errorEl = container.querySelector('#course-error');
    errorEl.textContent = '';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإضافة...';

    const result = await onCreate({
      title: formData.get('title').trim(),
      creditHours: Number(formData.get('creditHours')),
      difficulty: formData.get('difficulty'),
      priority: formData.get('priority'),
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icons.plus(16)} <span>إضافة المساق</span>`;

    if (result?.error) {
      errorEl.textContent = result.error.message || 'حدث خطأ أثناء إضافة المساق';
    } else {
      form.reset();
    }
  });
}

function getDifficultyBadgeClass(difficulty) {
  switch (difficulty) {
    case 'hard':
      return 'badge badge-danger';
    case 'medium':
      return 'badge badge-warning';
    case 'easy':
      return 'badge badge-success';
    default:
      return 'badge';
  }
}

function getDifficultyLabel(difficulty) {
  switch (difficulty) {
    case 'hard':
      return 'صعب';
    case 'medium':
      return 'متوسط';
    case 'easy':
      return 'سهل';
    default:
      return difficulty || '—';
  }
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 'high':
      return 'أولوية عالية';
    case 'medium':
      return 'أولوية متوسطة';
    case 'low':
      return 'أولوية منخفضة';
    default:
      return priority || '—';
  }
}
