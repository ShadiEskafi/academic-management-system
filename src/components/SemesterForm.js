// src/components/SemesterForm.js
import { icons } from '../utils/icons.js';

import { escapeHtml } from '../utils/sanitize.js';

export function renderSemesterForm(
  container,
  { semesters = [], onCreate, onSelectSemester, onEditSemester, onDeleteSemester }
) {
  container.innerHTML = `
    <div class="page-container">
      <header style="margin-bottom:var(--space-6);">
        <h1 style="margin-bottom:var(--space-1);">الفصول الدراسية</h1>
        <p class="text-secondary" style="font-size:14px;">إدارة ومتابعة فصولك الدراسية والمساقات التابعة لها.</p>
      </header>

      <section class="card" style="margin-bottom:var(--space-6);">
        <form id="semester-form" style="display:flex;gap:var(--space-3);align-items:flex-start;flex-wrap:wrap;">
          <div style="flex:1;min-width:260px;">
            <input
              type="text"
              name="title"
              class="input"
              placeholder="اسم الفصل الدراسي (مثال: الفصل الأول 2026/2027)"
              required
              autocomplete="off"
            />
          </div>
          <button type="submit" class="btn-primary" style="flex-shrink:0;">
            ${icons.plus(16)}
            <span>إضافة فصل دراسي</span>
          </button>
        </form>
        <p id="semester-error" class="field-error" style="margin-top:var(--space-2);"></p>
      </section>

      <section>
        ${
          semesters.length === 0
            ? `
            <div class="card empty-state">
              <div class="empty-state-icon" aria-hidden="true">${icons.book(32)}</div>
              <h3>لا توجد فصول دراسية بعد</h3>
              <p>أضف أول فصل دراسي لتنظيم مساقاتك ومحتواها الأكاديمي.</p>
            </div>
          `
            : `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:var(--space-4);">
              ${semesters
                .map(
                  (s) => `
                <article class="card card-level2 semester-card" data-id="${s.id}" style="display:flex;flex-direction:column;justify-content:space-between;gap:var(--space-4);cursor:pointer;">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-2);">
                    <div>
                      <h3 style="margin:0 0 var(--space-2);font-size:17px;font-weight:600;color:var(--color-text);">
                        ${escapeHtml(s.title)}
                      </h3>
                      <span class="${getStatusBadgeClass(s.status)}">
                        ${getStatusLabel(s.status)}
                      </span>
                    </div>

                    <div class="semester-card-actions" style="display:flex;align-items:center;gap:4px;">
                      <button type="button" class="btn-icon edit-semester-btn" data-id="${s.id}" title="تعديل الفصل" aria-label="تعديل الفصل">
                        ${icons.edit(15)}
                      </button>
                      <button type="button" class="btn-icon delete-semester-btn" data-id="${s.id}" title="حذف الفصل" aria-label="حذف الفصل" style="color:var(--color-danger);">
                        ${icons.trash(15)}
                      </button>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;padding-top:var(--space-3);border-top:1px solid var(--color-border);font-size:13px;">
                    <span class="text-secondary">المساقات الدراسية</span>
                    <span style="display:inline-flex;align-items:center;gap:4px;color:var(--color-accent);font-weight:600;">
                      <span>فتح المساقات</span>
                      ${icons.arrowLeft(14)}
                    </span>
                  </div>
                </article>
              `
                )
                .join('')}
            </div>
          `
        }
      </section>
    </div>
  `;

  // ربط أحداث النقر على البطاقة للانتقال للمساقات
  container.querySelectorAll('.semester-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.semester-card-actions')) return;
      const semester = semesters.find((s) => s.id === card.dataset.id);
      if (semester && onSelectSemester) {
        onSelectSemester(semester);
      }
    });
  });

  // ربط زر التعديل
  container.querySelectorAll('.edit-semester-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semester = semesters.find((s) => s.id === btn.dataset.id);
      if (semester && onEditSemester) {
        onEditSemester(semester);
      }
    });
  });

  // ربط زر الحذف
  container.querySelectorAll('.delete-semester-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const semester = semesters.find((s) => s.id === btn.dataset.id);
      if (semester && onDeleteSemester) {
        onDeleteSemester(semester);
      }
    });
  });

  // معالجة إضافة فصل دراسي
  const form = container.querySelector('#semester-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = form.querySelector('input[name="title"]');
    const title = titleInput.value.trim();
    const errorEl = container.querySelector('#semester-error');
    errorEl.textContent = '';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الإضافة...';

    const result = await onCreate({ title });

    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icons.plus(16)} <span>إضافة فصل دراسي</span>`;

    if (result?.error) {
      errorEl.textContent = result.error.message || 'حدث خطأ أثناء الإضافة';
    } else {
      form.reset();
    }
  });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'in_progress':
      return 'badge badge-accent';
    case 'completed':
      return 'badge badge-success';
    case 'planned':
    default:
      return 'badge';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'in_progress':
      return 'قيد الدراسة';
    case 'completed':
      return 'مكتمل';
    case 'planned':
    default:
      return 'مخطط له';
  }
}
