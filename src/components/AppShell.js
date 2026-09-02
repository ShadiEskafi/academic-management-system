// src/components/AppShell.js
// Shell ثابت: Header فيه زر Sign Out موجود بكل صفحة، وContainer للمحتوى تحته.
// Component "غبي": بيرسم الهيكل ويستدعي onSignOut، ما بيعرف شي عن Supabase.

export function renderAppShell(root, { userEmail, onSignOut }) {
  root.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1.5rem;border-bottom:1px solid #333;">
      <strong>Academic Management System</strong>
      <div style="display:flex;align-items:center;gap:1rem;font-size:14px;">
        <span style="opacity:0.7;">${userEmail}</span>
        <button id="signout-btn">Sign Out</button>
      </div>
    </header>
    <div id="content-container"></div>
  `;

  root.querySelector('#signout-btn').addEventListener('click', () => onSignOut());

  return root.querySelector('#content-container'); // الصفحات (Semesters/Courses...) بترسم هون
}