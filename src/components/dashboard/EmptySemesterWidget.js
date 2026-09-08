// src/components/dashboard/EmptySemesterWidget.js
// مكون الحالة الفارغة عند عدم توفر فصل دراسي نشط

import { icons } from '../../utils/icons.js';
import { navigate } from '../../state/router.js';

export function renderEmptySemesterWidget(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card empty-semester-widget';
  wrapper.style.cssText = `
    text-align: center;
    padding: var(--space-8) var(--space-6);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
    border: 1px stroke var(--color-border);
    border-radius: var(--radius-xl);
    margin-bottom: var(--space-6);
  `;

  wrapper.innerHTML = `
    <div style="
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-4);
      background: var(--color-bg-secondary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
    ">
      ${icons.academicCap(32)}
    </div>
    <h2 style="font-size: 20px; font-weight: 700; margin-bottom: var(--space-2); color: var(--color-text);">
      لا يوجد فصل دراسي نشط حالياً
    </h2>
    <p class="text-secondary" style="max-width: 500px; margin: 0 auto var(--space-6); font-size: 14px; line-height: 1.6;">
      لوحة التحكم تستعرض الإحصائيات والمقررات الخاصة بالفصل الدراسي الحالي. يرجى إنشاء فصل دراسي جديد أو تعيين أحد الفصول كـ "فصل نشط" لبدء متابعة تقدمك.
    </p>
    <button type="button" class="btn-primary" id="btn-go-to-semesters" style="display: inline-flex; align-items: center; gap: 8px;">
      ${icons.plus(18)}
      <span>الانتقال لإدارة الفصول الدراسية</span>
    </button>
  `;

  wrapper.querySelector('#btn-go-to-semesters')?.addEventListener('click', () => {
    navigate('/semesters');
  });

  container.appendChild(wrapper);
}
