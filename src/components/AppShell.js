// src/components/AppShell.js
// شريط التنقل العلوي العام مع رابط أوقات التفرغ وزر تسجيل الخروج

export function renderAppShell(container, { userEmail, onSignOut }) {
  container.innerHTML = `
    <header class="app-header">
      <div class="app-header-inner">
        <div style="display:flex;align-items:center;gap:1.5rem;">
          <a href="#/semesters" class="app-logo" style="text-decoration:none;font-weight:700;font-size:16px;color:var(--text-h);">
            🎓 نظام إدارة الدراسة
          </a>

          <nav style="display:flex;align-items:center;gap:0.75rem;">
            <a href="#/semesters" class="nav-header-link" id="nav-link-semesters">
              الفصول الدراسية
            </a>
            <a href="#/availability" class="nav-header-link" id="nav-link-availability">
              ⏰ أوقات التفرغ
            </a>
          </nav>
        </div>

        <div style="display:flex;align-items:center;gap:1rem;">
          <span style="font-size:13px;color:var(--text);">${escapeHtml(userEmail)}</span>
          <button type="button" id="shell-signout-btn" class="btn-secondary" style="font-size:12px;padding:4px 10px;">
            تسجيل الخروج
          </button>
        </div>
      </div>
    </header>

    <main id="app-content-container" class="app-main-content"></main>
  `;

  const signOutBtn = container.querySelector('#shell-signout-btn');
  const mainContent = container.querySelector('#app-content-container');

  signOutBtn.addEventListener('click', () => {
    if (onSignOut) onSignOut();
  });

  return mainContent;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}