// src/components/AppShell.js
import { icons } from '../utils/icons.js';

import { escapeHtml } from '../utils/sanitize.js';

export function renderAppShell(container, { userEmail, onSignOut }) {
  const initial = userEmail ? userEmail.trim().charAt(0).toUpperCase() : 'U';

  container.innerHTML = `
    <header class="app-header">
      <div class="app-header-inner">
        <div class="app-header-start">
          <a href="#/dashboard" class="app-logo">
            ${icons.academicCap(20)}
            <span class="app-logo-text">نظام إدارة الدراسة</span>
          </a>

          <nav class="app-nav">
            <a href="#/dashboard" class="nav-header-link" id="nav-link-dashboard">
              ${icons.layoutDashboard(16)}
              <span>لوحة التحكم</span>
            </a>
            <a href="#/semesters" class="nav-header-link" id="nav-link-semesters">
              ${icons.book(16)}
              <span>الفصول الدراسية</span>
            </a>
            <a href="#/availability" class="nav-header-link" id="nav-link-availability">
              ${icons.clock(16)}
              <span>أوقات التفرغ</span>
            </a>
          </nav>
        </div>

        <div class="app-user-area">
          <span class="app-user-email" title="${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</span>
          <div class="app-user-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
          <button type="button" id="shell-signout-btn" class="btn-secondary" style="min-height:36px;padding-inline:12px;font-size:13px;">
            تسجيل الخروج
          </button>
        </div>
      </div>
    </header>

    <main id="app-content-container" class="app-main-content"></main>
  `;

  const dashboardLink = container.querySelector('#nav-link-dashboard');
  const semestersLink = container.querySelector('#nav-link-semesters');
  const availabilityLink = container.querySelector('#nav-link-availability');
  const signOutBtn = container.querySelector('#shell-signout-btn');
  const mainContent = container.querySelector('#app-content-container');

  function updateActiveNav() {
    const hash = window.location.hash || '#/dashboard';
    dashboardLink.classList.remove('active');
    semestersLink.classList.remove('active');
    availabilityLink.classList.remove('active');

    if (hash.startsWith('#/availability')) {
      availabilityLink.classList.add('active');
    } else if (hash.startsWith('#/semesters')) {
      semestersLink.classList.add('active');
    } else {
      dashboardLink.classList.add('active');
    }
  }

  updateActiveNav();
  window.addEventListener('hashchange', updateActiveNav);

  signOutBtn.addEventListener('click', () => {
    window.removeEventListener('hashchange', updateActiveNav);
    if (onSignOut) onSignOut();
  });

  return mainContent;
}
