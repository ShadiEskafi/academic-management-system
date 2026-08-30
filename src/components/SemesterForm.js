// src/components/SemesterForm.js
// Component "غبي": فورم إنشاء + قائمة عرض. بيستقبل الداتا ويستدعي callback،
// ما بيعرف شي عن Supabase ولا عن الـ store.

export function renderSemesterForm(container, { semesters, onCreate }) {
  container.innerHTML = `
    <div style="max-width:400px;margin:2rem auto;">
      <h2>Semesters</h2>

      <form id="semester-form" style="display:flex;gap:0.5rem;margin-bottom:1rem;">
        <input type="text" name="title" placeholder="Semester title (e.g. Fall 2026)" required style="flex:1;" />
        <button type="submit">Add</button>
      </form>
      <p id="semester-error" style="color:#e05252;font-size:14px;"></p>

      <ul id="semester-list" style="list-style:none;padding:0;">
        ${semesters.map(s => `
          <li style="padding:0.5rem;border-bottom:1px solid #333;">
            <strong>${s.title}</strong>
            <span style="opacity:0.7;font-size:13px;"> — ${s.status}</span>
          </li>
        `).join('') || '<li style="opacity:0.6;">No semesters yet.</li>'}
      </ul>
    </div>
  `;

  container.querySelector('#semester-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = new FormData(e.target).get('title');
    const errorEl = container.querySelector('#semester-error');
    errorEl.textContent = '';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const result = await onCreate({ title });

    submitBtn.disabled = false;
    if (result?.error) {
      errorEl.textContent = result.error.message ?? 'حدث خطأ، حاول مرة ثانية';
    } else {
      e.target.reset();
    }
  });
}