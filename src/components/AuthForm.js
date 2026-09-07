// src/components/AuthForm.js
// شاشة تسجيل الدخول والتسجيل وفق نظام التصميم المعتمد
import { icons } from '../utils/icons.js';

export function renderAuthForm(container, { onSubmit }) {
  let mode = 'signin';

  function render() {
    container.innerHTML = `
      <div class="auth-page-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo-icon">
              ${icons.academicCap(26)}
            </div>
            <h2 class="auth-title">
              ${mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </h2>
            <p class="auth-subtitle">
              نظام إدارة الدراسة الأكاديمية وجدولة المساقات
            </p>
          </div>

          <form id="auth-form" class="auth-form">
            <div class="field">
              <label class="field-label" for="auth-email">البريد الإلكتروني</label>
              <input
                id="auth-email"
                class="input font-en"
                type="email"
                name="email"
                placeholder="name@university.edu"
                dir="ltr"
                required
                autocomplete="email"
              />
            </div>

            <div class="field">
              <label class="field-label" for="auth-password">كلمة المرور</label>
              <input
                id="auth-password"
                class="input font-en"
                type="password"
                name="password"
                placeholder="••••••••"
                minlength="6"
                dir="ltr"
                required
                autocomplete="current-password"
              />
            </div>

            <p id="auth-error" class="field-error" style="min-height:1.2em;"></p>

            <button type="submit" class="btn-primary auth-submit-btn">
              ${mode === 'signin' ? 'دخول للنظام' : 'تأكيد التسجيل'}
            </button>
          </form>

          <div class="auth-footer">
            <button type="button" id="toggle-mode" class="auth-toggle-btn">
              ${mode === 'signin' ? 'ليس لديك حساب؟ سجل حساباً جديداً' : 'لديك حساب مسجل بالفعل؟ تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
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
      submitBtn.classList.add('btn-loading');

      const result = await onSubmit({ mode, email, password });

      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');

      if (result?.error) {
        errorEl.textContent = result.error.message || 'حدث خطأ، حاول مرة ثانية';
      }
    });
  }

  render();
}