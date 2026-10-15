// src/pages/AdminPage.js
// شاشة لوحة تحكم الأدمن المستقلة (Standalone Admin Cockpit)
// معزولة كلياً عن واجهة الطالب وتُحقن مباشرة في الحاوية الجذرية
// Zero-Framework Architecture (فانيلا JS نقية ES2022+)

import {
  getAdminDashboardData,
  updateWaitlistStatus,
  deleteWaitlistEntry,
  createInviteCode,
  updateInviteCode,
  toggleInviteCodeStatus,
  deleteInviteCode,
} from '../api/admin.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';
import { getTheme, toggleTheme } from '../utils/theme.js';

/**
 * تنسيق التاريخ بالعربية
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * توليد الشارة اللونية المناسبة لكل حالة
 */
function renderStatusBadge(status) {
  const s = String(status || 'pending').toLowerCase();
  switch (s) {
    case 'approved':
      return `<span class="admin-badge admin-badge-success">${icons.check(12)} تم القبول</span>`;
    case 'contacted':
      return `<span class="admin-badge admin-badge-info">${icons.mail(12)} تم التواصل</span>`;
    case 'archived':
      return `<span class="admin-badge admin-badge-muted">${icons.x(12)} مؤرشف</span>`;
    case 'pending':
    default:
      return `<span class="admin-badge admin-badge-warning">${icons.clock(12)} قيد الانتظار</span>`;
  }
}

/**
 * تصدير بيانات قائمة الانتظار إلى ملف CSV مع إضافة الـ UTF-8 BOM (\uFEFF)
 * لضمان عدم تشوه الأحرف العربية (Mojibake) عند فتحه في Microsoft Excel
 */
function exportWaitlistToCSV(items) {
  if (!items || items.length === 0) {
    alert('لا توجد بيانات متاحة للتصدير.');
    return;
  }

  const headers = ['رقم المقعد', 'الاسم', 'البريد الإلكتروني', 'الجامعة', 'التخصص', 'الحالة', 'تاريخ التسجيل'];
  const rows = items.map((item) => [
    item.seat_number ?? '',
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(item.university || '').replace(/"/g, '""')}"`,
    `"${(item.major || '').replace(/"/g, '""')}"`,
    item.status || 'pending',
    item.created_at || '',
  ]);

  // إضافة علامة UTF-8 BOM في بداية الملف
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `mihwar-waitlist-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function renderAdminPage(container, { user, onSignOut, onGoToStudent } = {}) {
  // ---- Local State ----
  let waitlist = [];
  let profiles = [];
  let inviteCodes = [];
  let metrics = {
    totalWaitlist: 0,
    totalProfiles: 0,
    studentsCount: 0,
    statusCounts: { pending: 0, approved: 0, contacted: 0, archived: 0 },
    conversionRate: '0.0',
    uniMap: {},
    majorMap: {},
    codeUsageMap: {},
    totalCodes: 0,
    activeCodes: 0,
    totalStudentsWithCodes: 0,
  };

  let activeTab = 'waitlist'; // 'waitlist' | 'demographics' | 'profiles' | 'invite-codes'
  let statusFilter = 'all'; // 'all' | 'pending' | 'approved' | 'contacted' | 'archived'
  let codeFilter = 'all'; // 'all' | 'none' | 'has_code' | specificCodeId
  let searchQuery = '';
  let activeModal = null;
  let toastTimeout = null;

  const userEmail = user?.email || 'Admin';
  const initial = userEmail.trim().charAt(0).toUpperCase();

  // هيكل لوحة الأدمن المستقلة (Standalone Cockpit)
  container.innerHTML = `
    <div class="admin-cockpit-layout">
      <!-- شريط الملاحة الإداري المستقل بالكامل (Admin Standalone Navbar) -->
      <header class="admin-cockpit-navbar">
        <div class="admin-cockpit-nav-start">
          <div class="admin-cockpit-logo-group">
            <span class="admin-cockpit-logo-icon">${icons.academicCap(22)}</span>
            <span class="admin-cockpit-brand-name">مِحْوَر</span>
            <span class="admin-cockpit-pill">لوحة الإدارة المركزية</span>
          </div>

          <div class="admin-cockpit-status-badge" title="حالة الاتصال والخدمات السحابية">
            <span class="admin-live-pulse"></span>
            <span>الأنظمة متصلة</span>
          </div>
        </div>

        <div class="admin-cockpit-nav-end">
          <button type="button" id="admin-theme-toggle-btn" class="theme-toggle-btn" title="تبديل المظهر" aria-label="تبديل المظهر"></button>

          <button type="button" id="admin-btn-to-student" class="btn-secondary admin-btn-to-student" title="الانتقال إلى واجهة الطالب">
            ${icons.book(15)}
            <span>منصة الطالب</span>
          </button>

          <div class="admin-user-profile-chip">
            <div class="admin-user-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
            <span class="admin-user-email-text" title="${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</span>
          </div>

          <button type="button" id="admin-cockpit-signout-btn" class="btn-secondary" style="min-height:36px;padding-inline:12px;font-size:13px;">
            تسجيل الخروج
          </button>
        </div>
      </header>

      <!-- محتوى لوحة الإدارة -->
      <main class="page-container admin-page-wrapper">
        <section class="admin-header">
          <div class="admin-header-title-area">
            <h1 class="admin-title">لوحة الإدارة والتحكم المركزية</h1>
            <p class="admin-subtitle">
              مراقبة مؤشرات منصة مِحْوَر، إدارة قائمة الانتظار، واستعراض حسابات الطلاب وتوزيع الجامعات وأكواد الشراكات.
            </p>
          </div>

          <div class="admin-header-actions">
            <button type="button" id="admin-export-btn" class="btn-secondary" title="تصدير قائمة الانتظار إلى Excel CSV">
              ${icons.download(16)}
              <span>تصدير CSV</span>
            </button>
            <button type="button" id="admin-refresh-btn" class="btn-primary" title="تحديث البيانات فوراً">
              ${icons.refresh(16)}
              <span>تحديث البيانات</span>
            </button>
          </div>
        </section>

        <!-- شبكة بطاقات الـ KPIs الرئيسية -->
        <section class="admin-kpi-grid" id="admin-kpi-grid">
          <!-- يتم رسمها عبر renderKPIs() -->
        </section>

        <!-- شريط تبويبات الأقسام -->
        <nav class="admin-tabs-nav" aria-label="أقسام الإدارة">
          <button type="button" class="admin-tab-btn active" data-tab="waitlist">
            ${icons.users(16)}
            <span>إدارة قائمة الانتظار</span>
            <span class="admin-tab-counter" id="tab-counter-waitlist">0</span>
          </button>
          <button type="button" class="admin-tab-btn" data-tab="demographics">
            ${icons.barChart(16)}
            <span>توزيع الجامعات والتخصصات</span>
          </button>
          <button type="button" class="admin-tab-btn" data-tab="profiles">
            ${icons.shieldCheck(16)}
            <span>حسابات النظام المسجلة</span>
            <span class="admin-tab-counter" id="tab-counter-profiles">0</span>
          </button>
          <button type="button" class="admin-tab-btn" data-tab="invite-codes">
            ${icons.sparkles(16)}
            <span>أكواد الدعوة والشراكات</span>
            <span class="admin-tab-counter" id="tab-counter-codes">0</span>
          </button>
        </nav>

        <!-- الحاوية الديناميكية لمحتوى التبويب المختار -->
        <section class="admin-tab-content" id="admin-tab-content">
          <!-- يتم تعبئتها ديناميكياً -->
        </section>
      </main>

      <!-- حاوية رسائل التنبيه السريع (Toast) -->
      <div id="admin-toast-container" class="admin-toast-container" aria-live="polite"></div>
    </div>
  `;

  // ربط عناصر الهيدر
  const themeToggleBtn = container.querySelector('#admin-theme-toggle-btn');
  const toStudentBtn = container.querySelector('#admin-btn-to-student');
  const signoutBtn = container.querySelector('#admin-cockpit-signout-btn');

  // ربط عناصر المحتوى
  const kpiGridEl = container.querySelector('#admin-kpi-grid');
  const tabContentEl = container.querySelector('#admin-tab-content');
  const tabBtns = container.querySelectorAll('.admin-tab-btn');
  const refreshBtn = container.querySelector('#admin-refresh-btn');
  const exportBtn = container.querySelector('#admin-export-btn');
  const counterWaitlistEl = container.querySelector('#tab-counter-waitlist');
  const counterProfilesEl = container.querySelector('#tab-counter-profiles');
  const counterCodesEl = container.querySelector('#tab-counter-codes');
  const toastContainerEl = container.querySelector('#admin-toast-container');

  // ضبط زر المظهر
  function updateThemeButton() {
    const currentTheme = getTheme();
    if (currentTheme === 'dark') {
      themeToggleBtn.innerHTML = icons.sun(18);
      themeToggleBtn.title = 'التبديل إلى الوضع الفاتح';
      themeToggleBtn.setAttribute('aria-label', 'التبديل إلى الوضع الفاتح');
    } else {
      themeToggleBtn.innerHTML = icons.moon(18);
      themeToggleBtn.title = 'التبديل إلى الوضع الداكن';
      themeToggleBtn.setAttribute('aria-label', 'التبديل إلى الوضع الداكن');
    }
  }

  updateThemeButton();
  themeToggleBtn.addEventListener('click', () => {
    toggleTheme();
    updateThemeButton();
  });

  const onThemeChanged = () => updateThemeButton();
  window.addEventListener('theme-changed', onThemeChanged);

  // الانتقال لمنصة الطالب
  toStudentBtn.addEventListener('click', () => {
    if (onGoToStudent) {
      onGoToStudent();
    } else {
      window.location.hash = '#/dashboard';
    }
  });

  // تسجيل الخروج
  signoutBtn.addEventListener('click', () => {
    if (onSignOut) onSignOut();
  });

  /**
   * إظهار إشعار Toast سريع
   */
  function showToast(message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastContainerEl.innerHTML = `
      <div class="admin-toast admin-toast-${type}">
        ${type === 'success' ? icons.check(16) : icons.alertTriangle(16)}
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    toastTimeout = setTimeout(() => {
      toastContainerEl.innerHTML = '';
    }, 3500);
  }

  /**
   * إعادة حساب المقاييس المحلية عند التحديث السريع
   */
  function recomputeLocalMetrics() {
    const totalWaitlist = waitlist.length;
    const totalProfiles = profiles.length;
    const studentsCount = profiles.filter((p) => p.role === 'student').length;

    const statusCounts = { pending: 0, approved: 0, contacted: 0, archived: 0 };
    const uniMap = {};
    const majorMap = {};

    waitlist.forEach((item) => {
      const s = item.status || 'pending';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
      if (item.university) uniMap[item.university] = (uniMap[item.university] || 0) + 1;
      if (item.major) majorMap[item.major] = (majorMap[item.major] || 0) + 1;
    });

    const approvedCount = statusCounts.approved || 0;
    const conversionRate = totalWaitlist > 0 ? ((approvedCount / totalWaitlist) * 100).toFixed(1) : '0.0';

    const totalCodes = inviteCodes.length;
    const activeCodes = inviteCodes.filter((c) => c.is_active).length;
    const totalStudentsWithCodes = waitlist.filter((w) => Boolean(w.invite_code_id)).length;
    const codeUsageMap = {};
    waitlist.forEach((item) => {
      if (item.invite_code_id) {
        codeUsageMap[item.invite_code_id] = (codeUsageMap[item.invite_code_id] || 0) + 1;
      }
    });

    metrics = {
      totalWaitlist,
      totalProfiles,
      studentsCount,
      statusCounts,
      conversionRate,
      uniMap,
      majorMap,
      codeUsageMap,
      totalCodes,
      activeCodes,
      totalStudentsWithCodes,
    };

    counterWaitlistEl.textContent = String(totalWaitlist);
    counterProfilesEl.textContent = String(totalProfiles);
    if (counterCodesEl) counterCodesEl.textContent = String(activeCodes);
  }

  /**
   * رسم بطاقات الـ KPIs الرئيسية
   */
  function renderKPIs() {
    kpiGridEl.innerHTML = `
      <div class="card admin-kpi-card kpi-amber">
        <div class="admin-kpi-header">
          <span class="admin-kpi-title">إجمالي قائمة الانتظار</span>
          <span class="admin-kpi-icon-badge">${icons.sparkles(18)}</span>
        </div>
        <div class="admin-kpi-value">${metrics.totalWaitlist}</div>
        <div class="admin-kpi-footer">
          <span>المقاعد المسجلة في طابور الإطلاق</span>
        </div>
      </div>

      <div class="card admin-kpi-card kpi-warning">
        <div class="admin-kpi-header">
          <span class="admin-kpi-title">طلبات قيد الانتظار</span>
          <span class="admin-kpi-icon-badge">${icons.clock(18)}</span>
        </div>
        <div class="admin-kpi-value">${metrics.statusCounts.pending || 0}</div>
        <div class="admin-kpi-footer">
          <span>تحتاج للمراجعة وتأكيد المقاعد</span>
        </div>
      </div>

      <div class="card admin-kpi-card kpi-accent">
        <div class="admin-kpi-header">
          <span class="admin-kpi-title">طلاب مِحْوَر الفعليين</span>
          <span class="admin-kpi-icon-badge">${icons.academicCap(18)}</span>
        </div>
        <div class="admin-kpi-value">${metrics.studentsCount}</div>
        <div class="admin-kpi-footer">
          <span>حسابات نشطة في قاعدة البيانات</span>
        </div>
      </div>

      <div class="card admin-kpi-card kpi-success">
        <div class="admin-kpi-header">
          <span class="admin-kpi-title">نسبة القبول والتحويل</span>
          <span class="admin-kpi-icon-badge">${icons.trendingUp(18)}</span>
        </div>
        <div class="admin-kpi-value">${metrics.conversionRate}%</div>
        <div class="admin-kpi-footer">
          <span>${metrics.statusCounts.approved || 0} طلب تم قبوله رسميًا</span>
        </div>
      </div>
    `;
  }

  /**
   * رسم تبويب قائمة الانتظار
   */
  function renderWaitlistTab() {
    const filtered = waitlist.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' || (item.status || 'pending').toLowerCase() === statusFilter;

      if (!matchesStatus) return false;

      const matchesCode =
        codeFilter === 'all' ||
        (codeFilter === 'none' && !item.invite_code_id) ||
        (codeFilter === 'has_code' && Boolean(item.invite_code_id)) ||
        String(item.invite_code_id) === String(codeFilter);

      if (!matchesCode) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (item.name || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const major = (item.major || '').toLowerCase();
      const uni = (item.university || '').toLowerCase();
      const seat = String(item.seat_number || '');
      const codeName = (item.invite_codes?.name || '').toLowerCase();
      const codeStr = (item.invite_codes?.code || '').toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        major.includes(q) ||
        uni.includes(q) ||
        seat.includes(q) ||
        codeName.includes(q) ||
        codeStr.includes(q)
      );
    });

    tabContentEl.innerHTML = `
      <div class="admin-toolbar">
        <div class="admin-search-wrapper">
          <span class="admin-search-icon">${icons.search(16)}</span>
          <input
            type="text"
            id="waitlist-search-input"
            class="admin-search-input"
            placeholder="البحث بالاسم، الإيميل، رقم المقعد، الجامعة، التخصص أو كود الدعوة..."
            value="${escapeHtml(searchQuery)}"
          />
          ${
            searchQuery
              ? '<button type="button" id="clear-search-btn" class="admin-clear-search-btn" title="مسح البحث">&times;</button>'
              : ''
          }
        </div>

        <div class="admin-status-filters" role="group" aria-label="تصفية حسب الحالة">
          <button type="button" class="admin-filter-pill ${statusFilter === 'all' ? 'active' : ''}" data-status="all">
            الكل (${waitlist.length})
          </button>
          <button type="button" class="admin-filter-pill ${statusFilter === 'pending' ? 'active' : ''}" data-status="pending">
            قيد الانتظار (${metrics.statusCounts.pending || 0})
          </button>
          <button type="button" class="admin-filter-pill ${statusFilter === 'approved' ? 'active' : ''}" data-status="approved">
            تم القبول (${metrics.statusCounts.approved || 0})
          </button>
          <button type="button" class="admin-filter-pill ${statusFilter === 'contacted' ? 'active' : ''}" data-status="contacted">
            تم التواصل (${metrics.statusCounts.contacted || 0})
          </button>
          <button type="button" class="admin-filter-pill ${statusFilter === 'archived' ? 'active' : ''}" data-status="archived">
            مؤرشف (${metrics.statusCounts.archived || 0})
          </button>
        </div>

        <div class="admin-code-filter-wrapper">
          <span class="admin-filter-label">${icons.sparkles(13)} مصدر التسجيل:</span>
          <select id="waitlist-code-filter" class="admin-status-select" aria-label="تصفية حسب مصدر التسجيل">
            <option value="all" ${codeFilter === 'all' ? 'selected' : ''}>جميع مصادر التسجيل</option>
            <option value="none" ${codeFilter === 'none' ? 'selected' : ''}>تسجيل عادي (بدون كود)</option>
            <option value="has_code" ${codeFilter === 'has_code' ? 'selected' : ''}>كل المسجلين عبر الشركاء (${metrics.totalStudentsWithCodes || 0})</option>
            ${inviteCodes
              .map(
                (c) => `
                  <option value="${c.id}" ${String(codeFilter) === String(c.id) ? 'selected' : ''}>
                    ${escapeHtml(c.name)} [${escapeHtml(c.code)}] (${metrics.codeUsageMap[c.id] || 0})
                  </option>
                `
              )
              .join('')}
          </select>
          ${
            codeFilter !== 'all'
              ? `
                <button type="button" id="btn-reset-code-filter" class="admin-btn-reset-code-filter" title="إلغاء تصفية الكود">
                  ${icons.x(13)}
                </button>
              `
              : ''
          }
        </div>
      </div>

      <div class="card admin-table-container">
        ${
          filtered.length === 0
            ? `
              <div class="admin-empty-state">
                <div class="admin-empty-icon">${icons.users(32)}</div>
                <h3>لا توجد سجلات مطابقة</h3>
                <p>لم يتم العثور على أي نتائج تطابق معايير البحث أو الفلتر المحددة.</p>
              </div>
            `
            : `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th style="width:70px;">المقعد</th>
                    <th>الطالب</th>
                    <th>البريد الإلكتروني</th>
                    <th>الجامعة والتخصص</th>
                    <th>كود الدعوة / الشريك</th>
                    <th>تاريخ التسجيل</th>
                    <th>الحالة</th>
                    <th style="text-align:center;width:150px;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map((item) => {
                      const currentStatus = (item.status || 'pending').toLowerCase();
                      const codeObj = item.invite_codes;
                      return `
                        <tr data-row-id="${item.id}">
                          <td>
                            <span class="admin-seat-chip">#${item.seat_number ?? '—'}</span>
                          </td>
                          <td>
                            <div class="admin-student-name">${escapeHtml(item.name || 'بدون اسم')}</div>
                          </td>
                          <td>
                            <div class="admin-email-cell">
                              <span class="admin-email-text" title="${escapeHtml(item.email)}">${escapeHtml(item.email)}</span>
                              <button type="button" class="admin-btn-copy-email" data-email="${escapeHtml(item.email)}" title="نسخ البريد">
                                ${icons.copy(14)}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div class="admin-uni-text">${escapeHtml(item.university || 'غير محدد')}</div>
                            <div class="admin-major-text">${escapeHtml(item.major || 'غير محدد')}</div>
                          </td>
                          <td>
                            ${
                              codeObj?.code
                                ? `
                                  <div class="admin-partner-code-tag" title="${escapeHtml(codeObj.name || '')}">
                                    <span class="admin-partner-sparkle">${icons.sparkles(11)}</span>
                                    <span>${escapeHtml(codeObj.code)}</span>
                                  </div>
                                `
                                : `<span class="text-secondary" style="font-size:12px;opacity:0.5;">—</span>`
                            }
                          </td>
                          <td>
                            <span class="admin-date-text">${formatDate(item.created_at)}</span>
                          </td>
                          <td>
                            ${renderStatusBadge(currentStatus)}
                          </td>
                          <td>
                            <div class="admin-row-actions">
                              <select class="admin-status-select" data-id="${item.id}" aria-label="تغيير الحالة">
                                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                                <option value="approved" ${currentStatus === 'approved' ? 'selected' : ''}>قبول رسمي</option>
                                <option value="contacted" ${currentStatus === 'contacted' ? 'selected' : ''}>تم التواصل</option>
                                <option value="archived" ${currentStatus === 'archived' ? 'selected' : ''}>أرشفة</option>
                              </select>
                              <button type="button" class="admin-btn-delete" data-id="${item.id}" data-name="${escapeHtml(item.name)}" title="حذف السجل">
                                ${icons.trash(14)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
        }
      </div>
    `;

    // ربط أحداث شريط الأدوات والجدول
    const searchInput = tabContentEl.querySelector('#waitlist-search-input');
    const clearSearchBtn = tabContentEl.querySelector('#clear-search-btn');
    const filterPills = tabContentEl.querySelectorAll('.admin-filter-pill');
    const codeFilterSelect = tabContentEl.querySelector('#waitlist-code-filter');
    const resetCodeFilterBtn = tabContentEl.querySelector('#btn-reset-code-filter');
    const copyBtns = tabContentEl.querySelectorAll('.admin-btn-copy-email');
    const statusSelects = tabContentEl.querySelectorAll('.admin-status-select');
    const deleteBtns = tabContentEl.querySelectorAll('.admin-btn-delete');

    if (codeFilterSelect) {
      codeFilterSelect.addEventListener('change', (e) => {
        codeFilter = e.target.value;
        renderWaitlistTab();
      });
    }

    if (resetCodeFilterBtn) {
      resetCodeFilterBtn.addEventListener('click', () => {
        codeFilter = 'all';
        renderWaitlistTab();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderWaitlistTab();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        renderWaitlistTab();
      });
    }

    filterPills.forEach((btn) => {
      btn.addEventListener('click', () => {
        statusFilter = btn.dataset.status;
        renderWaitlistTab();
      });
    });

    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        if (email) {
          try {
            await navigator.clipboard.writeText(email);
            showToast(`تم نسخ البريد (${email}) إلى الحافظة!`);
          } catch {
            showToast('تعذر النسخ التلقائي.', 'error');
          }
        }
      });
    });

    statusSelects.forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = select.dataset.id;
        const newStatus = e.target.value;
        const previousStatus = waitlist.find((w) => String(w.id) === String(id))?.status || 'pending';

        select.disabled = true;
        try {
          await updateWaitlistStatus(id, newStatus);
          const item = waitlist.find((w) => String(w.id) === String(id));
          if (item) item.status = newStatus;
          recomputeLocalMetrics();
          renderKPIs();
          renderWaitlistTab();
          showToast(`تم تحديث حالة الطالب #${item?.seat_number} إلى (${newStatus}).`);
        } catch (err) {
          console.error(err);
          select.value = previousStatus;
          select.disabled = false;
          showToast(err.message || 'فشل تحديث الحالة.', 'error');
        }
      });
    });

    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = waitlist.find((w) => String(w.id) === String(id));
        if (item) {
          showDeleteConfirmModal(item);
        }
      });
    });
  }

  /**
   * رسم تبويب التوزيع الديموغرافي للجامعات والتخصصات
   */
  function renderDemographicsTab() {
    const uniEntries = Object.entries(metrics.uniMap).sort((a, b) => b[1] - a[1]);
    const majorEntries = Object.entries(metrics.majorMap).sort((a, b) => b[1] - a[1]);
    const totalEntries = metrics.totalWaitlist || 1;

    tabContentEl.innerHTML = `
      <div class="admin-demographics-grid">
        <div class="card admin-chart-card">
          <div class="admin-chart-header">
            <h3>${icons.academicCap(18)} توزيع الطلاب حسب الجامعات</h3>
            <span class="text-secondary" style="font-size:13px;">${uniEntries.length} جامعة مسجلة</span>
          </div>
          <div class="admin-distribution-list">
            ${
              uniEntries.length === 0
                ? '<p class="text-secondary">لا توجد بيانات متاحة حالياً.</p>'
                : uniEntries
                    .map(([uni, count]) => {
                      const pct = ((count / totalEntries) * 100).toFixed(1);
                      return `
                        <div class="admin-distribution-item">
                          <div class="admin-distribution-label">
                            <span class="admin-dist-title">${escapeHtml(uni)}</span>
                            <span class="admin-dist-stats">${count} طالب (${pct}%)</span>
                          </div>
                          <div class="admin-progress-track">
                            <div class="admin-progress-fill" style="width:${pct}%;"></div>
                          </div>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>

        <div class="card admin-chart-card">
          <div class="admin-chart-header">
            <h3>${icons.book(18)} توزيع الطلاب حسب التخصص الأكاديمي</h3>
            <span class="text-secondary" style="font-size:13px;">${majorEntries.length} تخصص مسجل</span>
          </div>
          <div class="admin-distribution-list">
            ${
              majorEntries.length === 0
                ? '<p class="text-secondary">لا توجد بيانات متاحة حالياً.</p>'
                : majorEntries
                    .map(([major, count]) => {
                      const pct = ((count / totalEntries) * 100).toFixed(1);
                      return `
                        <div class="admin-distribution-item">
                          <div class="admin-distribution-label">
                            <span class="admin-dist-title">${escapeHtml(major)}</span>
                            <span class="admin-dist-stats">${count} طالب (${pct}%)</span>
                          </div>
                          <div class="admin-progress-track">
                            <div class="admin-progress-fill admin-progress-fill-coral" style="width:${pct}%;"></div>
                          </div>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * رسم تبويب الحسابات المسجلة في جدول profiles
   */
  function renderProfilesTab() {
    tabContentEl.innerHTML = `
      <div class="card admin-table-container">
        <div style="padding:var(--space-4);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;font-size:16px;">قاعدة بيانات المستخدمين المسجلين (${profiles.length})</h3>
          <span class="text-secondary" style="font-size:13px;">مؤشر الحسابات ذات الصلاحيات والطلاب</span>
        </div>

        ${
          profiles.length === 0
            ? `
              <div class="admin-empty-state">
                <p>لا توجد ملفات تعريف مسجلة حتى الآن.</p>
              </div>
            `
            : `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>المعرف والمستخدم</th>
                    <th>الرتبة في النظام</th>
                    <th>الجامعة والتخصص</th>
                    <th>رقم المقعد</th>
                    <th>تاريخ الانضمام</th>
                  </tr>
                </thead>
                <tbody>
                  ${profiles
                    .map((p) => {
                      const isAdmin = p.role === 'admin';
                      return `
                        <tr>
                          <td>
                            <div class="admin-student-name">${escapeHtml(p.full_name || 'بدون اسم')}</div>
                            <div class="text-secondary" style="font-size:11px;font-family:var(--font-mono);">${escapeHtml(p.id)}</div>
                          </td>
                          <td>
                            ${
                              isAdmin
                                ? `<span class="admin-badge admin-badge-role">${icons.shield(12)} مشرف النظام (Admin)</span>`
                                : `<span class="admin-badge admin-badge-info">${icons.academicCap(12)} طالب (Student)</span>`
                            }
                          </td>
                          <td>
                            <div class="admin-uni-text">${escapeHtml(p.university || '—')}</div>
                            <div class="admin-major-text">${escapeHtml(p.major || '—')}</div>
                          </td>
                          <td>
                            <span class="admin-seat-chip">#${p.seat_number ?? '—'}</span>
                          </td>
                          <td>
                            <span class="admin-date-text">${formatDate(p.created_at)}</span>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
        }
      </div>
    `;
  }

  /**
   * رسم تبويب أكواد الدعوة والشراكات (Invite Codes Management)
   */
  function renderInviteCodesTab() {
    tabContentEl.innerHTML = `
      <div class="admin-codes-header-card card">
        <div class="admin-codes-header-info">
          <div class="admin-codes-title-group">
            <div class="admin-codes-icon-box">${icons.sparkles(22)}</div>
            <div>
              <h2 class="admin-codes-title">إدارة أكواد الدعوة والشراكات (Invite Codes)</h2>
              <p class="admin-codes-desc">
                إنشاء وتعديل أكواد الشراكات مثل <strong>Island Heaven</strong>، للتحكم في الاعتماد التلقائي الفوري وتتبع أعداد الطلبة المنضمين عبر كل كود.
              </p>
            </div>
          </div>
          <button type="button" id="btn-create-code" class="btn-primary admin-btn-create-code">
            ${icons.sparkles(16)}
            <span>إضافة كود دعوة جديد</span>
          </button>
        </div>

        <!-- بطاقات المؤشرات المصغرة للأكواد -->
        <div class="admin-codes-kpi-row">
          <div class="admin-codes-mini-kpi">
            <span class="mini-kpi-label">إجمالي الأكواد</span>
            <span class="mini-kpi-val">${inviteCodes.length}</span>
          </div>
          <div class="admin-codes-mini-kpi">
            <span class="mini-kpi-label">الأكواد النشطة</span>
            <span class="mini-kpi-val text-success">${metrics.activeCodes || 0}</span>
          </div>
          <div class="admin-codes-mini-kpi">
            <span class="mini-kpi-label">الطلاب المنضمون عبر الأكواد</span>
            <span class="mini-kpi-val text-amber">${metrics.totalStudentsWithCodes || 0}</span>
          </div>
        </div>
      </div>

      <div class="card admin-table-container">
        ${
          inviteCodes.length === 0
            ? `
              <div class="admin-empty-state">
                <div class="admin-empty-icon">${icons.sparkles(32)}</div>
                <h3>لا توجد أكواد دعوة بعد</h3>
                <p>يمكنك إنشاء أول كود دعوة للشركاء مثل Island Heaven بالضغط على زر إضافة كود أعلاه.</p>
              </div>
            `
            : `
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الجهة / الشريك</th>
                    <th>الملاحظات</th>
                    <th>الطلاب المسجلون</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th style="text-align:center;width:190px;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${inviteCodes
                    .map((codeItem) => {
                      const count = metrics.codeUsageMap[codeItem.id] || 0;
                      const isActive = Boolean(codeItem.is_active);
                      return `
                        <tr data-code-id="${codeItem.id}">
                          <td>
                            <div class="admin-code-cell">
                              <span class="admin-code-tag">${escapeHtml(codeItem.code)}</span>
                              <button type="button" class="admin-btn-copy-code" data-code="${escapeHtml(codeItem.code)}" title="نسخ الكود">
                                ${icons.copy(13)}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div class="admin-partner-name">${escapeHtml(codeItem.name)}</div>
                          </td>
                          <td>
                            <span class="admin-notes-text">${escapeHtml(codeItem.notes || '—')}</span>
                          </td>
                          <td>
                            <button type="button" class="admin-students-count-btn" data-id="${codeItem.id}" title="عرض الطلاب المسجلين بهذا الكود">
                              <span class="count-num">${count}</span>
                              <span class="count-unit">طالب</span>
                              <span class="count-arrow">&larr;</span>
                            </button>
                          </td>
                          <td>
                            ${
                              isActive
                                ? `<span class="admin-badge admin-badge-success">${icons.check(12)} نشط ومفعّل</span>`
                                : `<span class="admin-badge admin-badge-muted">${icons.x(12)} متوقف ومحظور</span>`
                            }
                          </td>
                          <td>
                            <span class="admin-date-text">${formatDate(codeItem.created_at)}</span>
                          </td>
                          <td>
                            <div class="admin-row-actions">
                              <button 
                                type="button" 
                                class="btn-secondary admin-btn-toggle-code ${isActive ? 'is-active' : 'is-disabled'}" 
                                data-id="${codeItem.id}" 
                                data-active="${isActive ? 'true' : 'false'}"
                                title="${isActive ? 'إيقاف/حظر الكود' : 'إعادة تفعيل الكود'}"
                              >
                                ${isActive ? icons.shieldCheck(14) : icons.shield(14)}
                                <span>${isActive ? 'إيقاف' : 'تفعيل'}</span>
                              </button>

                              <button 
                                type="button" 
                                class="btn-secondary admin-btn-edit-code" 
                                data-id="${codeItem.id}" 
                                title="تعديل الكود"
                              >
                                ${icons.edit(14)}
                              </button>

                              <button 
                                type="button" 
                                class="admin-btn-delete admin-btn-delete-code" 
                                data-id="${codeItem.id}" 
                                data-code="${escapeHtml(codeItem.code)}" 
                                title="حذف الكود"
                              >
                                ${icons.trash(14)}
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
        }
      </div>
    `;

    // ربط الأحداث في تبويب الأكواد
    const createBtn = tabContentEl.querySelector('#btn-create-code');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        showInviteCodeModal();
      });
    }

    const copyCodeBtns = tabContentEl.querySelectorAll('.admin-btn-copy-code');
    copyCodeBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const c = btn.dataset.code;
        if (c) {
          try {
            await navigator.clipboard.writeText(c);
            showToast(`تم نسخ الكود (${c}) بنجاح!`);
          } catch {
            showToast('تعذر النسخ التلقائي.', 'error');
          }
        }
      });
    });

    const studentsCountBtns = tabContentEl.querySelectorAll('.admin-students-count-btn');
    studentsCountBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        codeFilter = id;
        switchTab('waitlist');
      });
    });

    const toggleBtns = tabContentEl.querySelectorAll('.admin-btn-toggle-code');
    toggleBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const currentActive = btn.dataset.active === 'true';
        const newActive = !currentActive;
        btn.disabled = true;
        try {
          await toggleInviteCodeStatus(id, newActive);
          const c = inviteCodes.find((item) => String(item.id) === String(id));
          if (c) c.is_active = newActive;
          recomputeLocalMetrics();
          renderInviteCodesTab();
          showToast(`تم ${newActive ? 'تفعيل' : 'إيقاف'} كود (${c?.code}) بنجاح.`);
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'فشل تحديث حالة الكود.', 'error');
        }
      });
    });

    const editBtns = tabContentEl.querySelectorAll('.admin-btn-edit-code');
    editBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const c = inviteCodes.find((item) => String(item.id) === String(id));
        if (c) {
          showInviteCodeModal(c);
        }
      });
    });

    const deleteCodeBtns = tabContentEl.querySelectorAll('.admin-btn-delete-code');
    deleteCodeBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const codeName = btn.dataset.code;
        const usageCount = metrics.codeUsageMap[id] || 0;
        if (usageCount > 0) {
          alert(`لا يمكن حذف الكود (${codeName}) لوجود ${usageCount} طالب مسجلين باستخدامه. يمكنك إيقافه أو حظره بدلاً من حذفه.`);
          return;
        }
        if (!confirm(`هل أنت متأكد من حذف كود الدعوة (${codeName})؟`)) {
          return;
        }
        btn.disabled = true;
        try {
          await deleteInviteCode(id);
          inviteCodes = inviteCodes.filter((item) => String(item.id) !== String(id));
          recomputeLocalMetrics();
          renderInviteCodesTab();
          showToast(`تم حذف كود الدعوة (${codeName}) بنجاح.`);
        } catch (err) {
          btn.disabled = false;
          showToast(err.message || 'فشل حذف الكود.', 'error');
        }
      });
    });
  }

  /**
   * نافذة إنشاء وتعديل كود الدعوة (Invite Code Modal)
   */
  function showInviteCodeModal(codeItem = null) {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
    if (modalKeydownHandler) {
      window.removeEventListener('keydown', modalKeydownHandler);
      modalKeydownHandler = null;
    }

    let modalRoot = document.getElementById('admin-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'admin-modal-root';
      document.body.appendChild(modalRoot);
    }

    const isEdit = Boolean(codeItem);
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop admin-delete-modal-backdrop';
    overlay.innerHTML = `
      <div class="card modal-content admin-code-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-code-title">
        <div class="admin-modal-header">
          <div class="admin-modal-amber-icon" aria-hidden="true">
            ${icons.sparkles(22)}
          </div>
          <div>
            <h3 id="modal-code-title" class="admin-modal-title">${isEdit ? 'تعديل كود الدعوة' : 'إضافة كود دعوة جديد'}</h3>
            <p class="admin-modal-subtitle">${isEdit ? 'تعديل اسم الشريك وبيانات الكود' : 'إنشاء كود جديد للاعتماد الفوري لشركاء مِحْوَر'}</p>
          </div>
        </div>

        <form id="invite-code-form" class="admin-modal-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="code-input">كود الدعوة *</label>
            <input 
              type="text" 
              id="code-input" 
              name="code" 
              class="form-input bidi-plaintext" 
              dir="ltr"
              placeholder="مثال: ISLAND-HEAVEN" 
              value="${escapeHtml(codeItem?.code || '')}" 
              required
              maxlength="40"
              style="font-family:var(--font-mono);font-weight:700;text-transform:uppercase;"
            />
            <span class="form-hint">يُفضل استخدام أحرف إنجليزية كبيرة وشرطات (UPPERCASE).</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="name-input">اسم الجهة أو الشريك *</label>
            <input 
              type="text" 
              id="name-input" 
              name="name" 
              class="form-input" 
              placeholder="مثال: Island Heaven - حاضنة طاقات وشباب" 
              value="${escapeHtml(codeItem?.name || '')}" 
              required
              maxlength="100"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="notes-input">ملاحظات داخلية (اختياري)</label>
            <textarea 
              id="notes-input" 
              name="notes" 
              class="form-textarea" 
              placeholder="مثال: كود خاص بطلاب الحاضنة المتواجدين في غزة للوصول الفوري..."
              rows="3"
            >${escapeHtml(codeItem?.notes || '')}</textarea>
          </div>

          <div class="admin-modal-error" id="code-modal-error" style="display:none;color:var(--color-danger);font-size:13px;margin-bottom:var(--space-3);"></div>

          <div class="admin-modal-actions">
            <button type="button" class="btn-secondary" id="modal-code-cancel">إلغاء (ESC)</button>
            <button type="submit" class="btn-primary" id="modal-code-submit">
              ${icons.check(14)}
              <span>${isEdit ? 'حفظ التعديلات' : 'إنشاء الكود وتفعيله'}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    modalRoot.appendChild(overlay);
    activeModal = overlay;

    const form = overlay.querySelector('#invite-code-form');
    const cancelBtn = overlay.querySelector('#modal-code-cancel');
    const submitBtn = overlay.querySelector('#modal-code-submit');
    const errorEl = overlay.querySelector('#code-modal-error');

    let isClosing = false;
    const closeModal = () => {
      if (isClosing) return;
      isClosing = true;

      if (modalKeydownHandler) {
        window.removeEventListener('keydown', modalKeydownHandler);
        modalKeydownHandler = null;
      }

      overlay.classList.add('is-closing');
      setTimeout(() => {
        if (overlay.parentElement) overlay.remove();
        if (activeModal === overlay) activeModal = null;
      }, 200);
    };

    modalKeydownHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener('keydown', modalKeydownHandler);

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeVal = form.code.value.trim().toUpperCase();
      const nameVal = form.name.value.trim();
      const notesVal = form.notes.value.trim();

      if (!codeVal || !nameVal) {
        errorEl.textContent = 'يرجى ملء حقلي الكود واسم الجهة للمتابعة.';
        errorEl.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>جاري الحفظ...</span>';
      errorEl.style.display = 'none';

      try {
        if (isEdit) {
          const updated = await updateInviteCode(codeItem.id, {
            code: codeVal,
            name: nameVal,
            notes: notesVal,
          });
          const idx = inviteCodes.findIndex((c) => String(c.id) === String(codeItem.id));
          if (idx !== -1) inviteCodes[idx] = updated;
          showToast(`تم تحديث كود (${codeVal}) بنجاح.`);
        } else {
          const created = await createInviteCode({
            code: codeVal,
            name: nameVal,
            notes: notesVal,
          });
          inviteCodes.unshift(created);
          showToast(`تم إنشاء كود (${codeVal}) بنجاح.`);
        }
        recomputeLocalMetrics();
        renderInviteCodesTab();
        closeModal();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${icons.check(14)} <span>${isEdit ? 'حفظ التعديلات' : 'إنشاء الكود وتفعيله'}</span>`;
        errorEl.textContent = err.message || 'حدث خطأ أثناء حفظ الكود.';
        errorEl.style.display = 'block';
      }
    });
  }

  /**
   * تبديل التبويب النشط
   */
  function switchTab(tabKey) {
    activeTab = tabKey;
    tabBtns.forEach((b) => {
      if (b.dataset.tab === tabKey) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    if (tabKey === 'waitlist') {
      renderWaitlistTab();
    } else if (tabKey === 'demographics') {
      renderDemographicsTab();
    } else if (tabKey === 'profiles') {
      renderProfilesTab();
    } else if (tabKey === 'invite-codes') {
      renderInviteCodesTab();
    }
  }

  let modalKeydownHandler = null;

  /**
   * نافذة تأكيد حذف سجل من قائمة الانتظار (Engineering Contract 4)
   */
  function showDeleteConfirmModal(item) {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
    if (modalKeydownHandler) {
      window.removeEventListener('keydown', modalKeydownHandler);
      modalKeydownHandler = null;
    }

    let modalRoot = document.getElementById('admin-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'admin-modal-root';
      document.body.appendChild(modalRoot);
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop admin-delete-modal-backdrop';
    overlay.innerHTML = `
      <div class="card modal-content admin-delete-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-del-title">
        <div class="admin-modal-header">
          <div class="admin-modal-coral-icon" aria-hidden="true">
            ${icons.alertTriangle(24)}
          </div>
          <div>
            <h3 id="modal-del-title" class="admin-modal-title">تأكيد حذف السجل نهائياً</h3>
            <p class="admin-modal-subtitle">سيتم إزالة بيانات الطالب من قاعدة البيانات نهائياً.</p>
          </div>
        </div>

        <div class="admin-modal-target-card">
          <div class="admin-modal-target-row">
            <span class="admin-modal-target-label">رقم المقعد:</span>
            <span class="admin-seat-chip">#${item.seat_number ?? '—'}</span>
          </div>
          <div class="admin-modal-target-row">
            <span class="admin-modal-target-label">اسم الطالب:</span>
            <strong class="admin-modal-target-val">${escapeHtml(item.name || 'بدون اسم')}</strong>
          </div>
          <div class="admin-modal-target-row">
            <span class="admin-modal-target-label">البريد الإلكتروني:</span>
            <span class="admin-modal-target-val admin-modal-mono">${escapeHtml(item.email || '—')}</span>
          </div>
        </div>

        <p class="admin-modal-warning-text">
          هل أنت متأكد من رغبتك في حذف هذا السجل؟ لن تتمكن من استرجاع هذا الطالب بعد تأكيد الحذف.
        </p>

        <div class="admin-modal-actions">
          <button type="button" class="btn-secondary" id="modal-del-cancel">تراجع (ESC)</button>
          <button type="button" class="btn-danger admin-btn-confirm-delete" id="modal-del-confirm">
            ${icons.trash(14)}
            <span>تأكيد الحذف نهائياً</span>
          </button>
        </div>
      </div>
    `;

    modalRoot.appendChild(overlay);
    activeModal = overlay;

    const cancelBtn = overlay.querySelector('#modal-del-cancel');
    const confirmBtn = overlay.querySelector('#modal-del-confirm');

    let isClosing = false;
    const closeModal = () => {
      if (isClosing) return;
      isClosing = true;

      if (modalKeydownHandler) {
        window.removeEventListener('keydown', modalKeydownHandler);
        modalKeydownHandler = null;
      }

      overlay.classList.add('is-closing');
      setTimeout(() => {
        if (overlay.parentElement) overlay.remove();
        if (activeModal === overlay) activeModal = null;
      }, 200);
    };

    modalKeydownHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener('keydown', modalKeydownHandler);

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>جاري الحذف...</span>`;
      try {
        await deleteWaitlistEntry(item.id);
        waitlist = waitlist.filter((w) => String(w.id) !== String(item.id));
        recomputeLocalMetrics();
        renderKPIs();
        renderWaitlistTab();
        closeModal();
        showToast(`تم حذف سجل الطالب #${item.seat_number} بنجاح.`);
      } catch (err) {
        console.error(err);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `${icons.trash(14)} <span>تأكيد الحذف نهائياً</span>`;
        alert(err.message || 'فشل حذف السجل من قاعدة البيانات.');
      }
    });
  }

  /**
   * تحميل البيانات المجمعة O(1)
   */
  async function loadData() {
    tabContentEl.innerHTML = `
      <div style="padding:var(--space-10);text-align:center;color:var(--color-text-secondary);">
        <p style="margin-bottom:var(--space-2);font-size:16px;">جاري جلب إحصائيات لوحة الإدارة وقائمة الانتظار...</p>
        <span class="admin-live-pulse" style="margin:auto;"></span>
      </div>
    `;

    try {
      const data = await getAdminDashboardData();
      waitlist = data.waitlist;
      profiles = data.profiles;
      inviteCodes = data.inviteCodes || [];
      metrics = data.metrics;

      counterWaitlistEl.textContent = String(metrics.totalWaitlist);
      counterProfilesEl.textContent = String(metrics.totalProfiles);
      if (counterCodesEl) counterCodesEl.textContent = String(metrics.activeCodes || 0);

      renderKPIs();
      switchTab(activeTab);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
      tabContentEl.innerHTML = `
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل بيانات لوحة الإدارة</h3>
          <p>${escapeHtml(err.message)}</p>
          <button type="button" class="btn-secondary" id="admin-retry-btn">إعادة المحاولة</button>
        </div>
      `;
      tabContentEl.querySelector('#admin-retry-btn')?.addEventListener('click', loadData);
    }
  }

  // ربط أزرار التحديث والتصدير
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    showToast('جاري تحديث البيانات...');
    await loadData();
    refreshBtn.disabled = false;
  });

  exportBtn.addEventListener('click', () => {
    exportWaitlistToCSV(waitlist);
  });

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // بدء التحميل الأولي
  await loadData();

  // عقد الـ Teardown الكامل لتفريغ الذاكرة
  return () => {
    window.removeEventListener('theme-changed', onThemeChanged);
    if (modalKeydownHandler) {
      window.removeEventListener('keydown', modalKeydownHandler);
      modalKeydownHandler = null;
    }
    if (activeModal && activeModal.parentElement) {
      activeModal.remove();
      activeModal = null;
    }
    const modalRoot = document.getElementById('admin-modal-root');
    if (modalRoot && modalRoot.children.length === 0) {
      modalRoot.remove();
    }
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    container.innerHTML = '';
  };
}
