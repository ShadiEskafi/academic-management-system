// src/components/AuthForm.js
// UC-01 (Sign Up) + UC-02 (Sign In) بشاشة واحدة، مع تبديل Mode.
// Component "غبي" قصدًا: بيرسم الفورم وبيستدعي callbacks تمريرية —
// ما بيعرف شي عن Supabase ولا عن الـ store، فقط عن الـ DOM.

export function renderAuthForm(container, { onSubmit }) {
  let mode = 'signin'; // 'signin' | 'signup'

  function render() {
    container.innerHTML = `
      <form id="auth-form" style="max-width:320px;margin:2rem auto;display:flex;flex-direction:column;gap:0.75rem;">
        <h2>${mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>

        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" minlength="6" required />

        <button type="submit">${mode === 'signin' ? 'Sign In' : 'Sign Up'}</button>

        <p id="auth-error" style="color:#e05252;font-size:14px;"></p>

        <button type="button" id="toggle-mode" style="background:none;border:none;text-decoration:underline;cursor:pointer;">
          ${mode === 'signin' ? 'ليش عندك حساب؟ سجّل جديد' : 'عندك حساب؟ سجّل دخول'}
        </button>
      </form>
    `;

    container.querySelector('#toggle-mode').addEventListener('click', () => {
      mode = mode === 'signin' ? 'signup' : 'signin';
      render();
    });

    container.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const errorEl = container.querySelector('#auth-error');
      errorEl.textContent = '';

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const result = await onSubmit({ mode, email, password });

      submitBtn.disabled = false;
      if (result?.error) {
        errorEl.textContent = result.error.message ?? 'حدث خطأ، حاول مرة ثانية';
      }
    });
  }

  render();
}