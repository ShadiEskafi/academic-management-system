// src/utils/skeletons.js
// قوالب التحميل الهيكلي (Skeleton States) لكافة شاشات النظام
// معتمدة على كلاسات style.css ومحاكية للشاشات الحقيقية

export const skeletons = {
  // هيكل بطاقات الفصول أو المساقات (Grid Cards)
  cards(count = 3) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:var(--space-4);">
        ${Array.from({ length: count })
          .map(
            () => `
          <div class="card" style="display:flex;flex-direction:column;gap:var(--space-4);min-height:160px;">
            <div>
              <div class="skeleton skeleton-title" style="width:55%;"></div>
              <div class="skeleton skeleton-text" style="width:30%;height:18px;border-radius:var(--radius-pill);"></div>
            </div>
            <div style="margin-top:auto;padding-top:var(--space-3);border-top:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
              <div class="skeleton skeleton-text" style="width:35%;margin:0;"></div>
              <div class="skeleton skeleton-text" style="width:25%;margin:0;"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  // هيكل شجرة المواضيع (Topic Tree Hierarchy)
  tree(count = 4) {
    return `
      <div style="display:flex;flex-direction:column;gap:var(--space-2);">
        ${Array.from({ length: count })
          .map(
            (_, i) => `
          <div class="card" style="padding:var(--space-3);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-inline-start:${i % 2 === 1 ? 'var(--space-5)' : '0'};">
            <div style="display:flex;align-items:center;gap:var(--space-3);flex:1;">
              <div class="skeleton" style="width:20px;height:20px;border-radius:var(--radius-sm);"></div>
              <div class="skeleton skeleton-text" style="width:${45 + (i * 10)}%;margin:0;"></div>
            </div>
            <div style="display:flex;gap:var(--space-2);">
              <div class="skeleton" style="width:65px;height:24px;border-radius:var(--radius-pill);"></div>
              <div class="skeleton" style="width:30px;height:24px;border-radius:var(--radius-sm);"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  // هيكل جدول الاستحقاقات والامتحانات (Assessments Table)
  tableRows(count = 4) {
    return `
      <div class="card" style="padding:0;overflow:hidden;">
        <table>
          <thead>
            <tr>
              <th style="width:140px;padding-inline-start:var(--space-4);">النوع</th>
              <th>العنوان</th>
              <th style="width:160px;">الموعد النهائي</th>
              <th style="width:120px;">الوزن / المدة</th>
              <th style="width:140px;">الحالة</th>
              <th style="width:90px;text-align:center;padding-inline-end:var(--space-4);">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: count })
              .map(
                () => `
              <tr>
                <td style="padding-inline-start:var(--space-4);"><div class="skeleton skeleton-text" style="width:80px;height:22px;border-radius:var(--radius-pill);margin:0;"></div></td>
                <td><div class="skeleton skeleton-text" style="width:60%;margin:0;"></div></td>
                <td><div class="skeleton skeleton-text" style="width:90px;margin:0;"></div></td>
                <td><div class="skeleton skeleton-text" style="width:50px;margin:0;"></div></td>
                <td><div class="skeleton skeleton-text" style="width:70px;margin:0;"></div></td>
                <td style="text-align:center;padding-inline-end:var(--space-4);"><div class="skeleton" style="width:50px;height:24px;margin:0 auto;border-radius:var(--radius-sm);"></div></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // هيكل شبكة أوقات التفرغ الأسبوعية (7 Days Columns)
  availabilityGrid() {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:var(--space-3);">
        ${Array.from({ length: 7 })
          .map(
            () => `
          <div class="card" style="padding:var(--space-3);display:flex;flex-direction:column;gap:var(--space-3);">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--color-border);padding-bottom:var(--space-2);">
              <div class="skeleton skeleton-text" style="width:45px;margin:0;"></div>
              <div class="skeleton" style="width:24px;height:24px;border-radius:var(--radius-sm);"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              <div class="skeleton skeleton-row" style="height:42px;border-radius:var(--radius-sm);margin:0;"></div>
              <div class="skeleton skeleton-row" style="height:42px;border-radius:var(--radius-sm);margin:0;"></div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },
};