// src/pages/LoginPage.js
// شاشة تسجيل الدخول المخصصة للبيتا المغلقة (Closed-Beta Login Screen)
// قفل التسجيل العام وحصر المصادقة بالبريد وكلمة المرور مع توجيهات الدفعة الأولى

import { supabase } from '../api/supabaseClient.js';
import { icons } from '../utils/icons.js';
import { escapeHtml, sanitizeInput } from '../utils/sanitize.js';
import { openActivationModal } from '../components/ActivationModal.js';
import { openWaitlistModal } from '../components/WaitlistModal.js';

// شعار مِحْوَر الفيكتوري الرسمي المعتمد
const officialMihwarLogoSvg = `
  <svg class="landing-brand-logo" viewBox="0 0 606 481" width="28" height="23" fill="none" aria-hidden="true">
    <path d="M329.556 3.23995C382.302 12.484 426.347 37.4974 459.517 77.0567C480.452 102.07 495.406 133.473 502.339 167.051C505.873 183.636 505.873 224.826 502.475 239.78C496.222 267.648 487.521 288.175 472.568 310.47C462.78 325.016 438.31 348.942 421.453 360.089C413.84 365.119 407.315 369.061 407.043 368.653C406.771 368.381 408.131 366.342 410.17 364.167C415.2 358.594 423.492 348.126 430.154 339.154C460.605 297.555 474.335 253.102 470.121 210.144C463.867 145.708 427.842 92.6901 371.019 64.414C349.404 53.5387 328.604 47.965 300.328 45.3821C247.855 40.4882 187.904 61.4233 143.995 100.167C110.009 130.074 80.7814 177.926 70.7216 220.34C69.0903 227.001 68.1387 228.089 56.0398 238.013C29.2592 259.763 15.2571 271.59 7.64433 279.067C-1.46382 287.903 -1.46381 288.175 2.61446 265.337C8.32404 232.983 12.2664 218.573 22.3261 192.88C39.9986 148.155 65.148 110.227 97.7742 78.824C135.838 42.3914 178.932 18.7374 230.318 5.9588C258.322 -0.838327 299.105 -1.92587 329.556 3.23995Z" fill="#F5A622"/>
    <path d="M197.556 114.985C188.176 125.045 185.593 128.171 176.757 139.863C156.501 166.915 144.81 192.2 138.557 223.467C133.663 246.985 135.43 282.738 142.499 306.256C156.909 354.244 193.614 396.794 238.475 417.865C267.294 431.323 294.075 436.489 327.925 435.13C358.648 433.77 384.885 427.245 412.481 413.787C432.736 403.999 450.273 391.492 468.625 373.82C491.192 352.069 503.155 335.756 518.788 305.305C524.226 294.837 534.014 268.192 536.053 257.997C536.868 254.462 541.762 249.704 561.066 233.527C574.253 222.38 589.614 209.057 594.916 203.891C600.353 198.726 605.111 194.783 605.383 195.055C605.791 195.327 605.519 198.318 604.84 201.716C604.16 205.115 601.985 216.398 600.082 226.866C590.022 280.427 567.727 330.726 536.868 369.741C495.678 421.671 438.582 459.327 379.175 473.465C357.968 478.495 351.443 479.311 325.886 479.991C305.766 480.534 296.93 480.262 284.423 478.359C222.162 469.251 170.096 437.577 135.43 387.686C126.458 374.771 115.583 352.884 110.145 336.979C95.0553 291.846 96.6866 243.859 114.767 201.58C124.283 179.558 137.469 160.798 156.501 142.445C170.096 129.395 195.245 111.179 200.275 110.771C201.09 110.635 199.731 112.674 197.556 114.985Z" fill="#F5A622"/>
    <path d="M303.455 295.38C334.162 295.38 359.055 270.487 359.055 239.78C359.055 209.072 334.162 184.179 303.455 184.179C272.747 184.179 247.854 209.072 247.854 239.78C247.854 270.487 272.747 295.38 303.455 295.38Z" fill="#FF6B5E"/>
  </svg>
`;

/**
 * رسم صفحة تسجيل الدخول للبيتا المغلقة
 * @param {HTMLElement} container
 * @returns {Function} cleanup
 */
export function renderLoginPage(container) {
  let isSubmitting = false;
  let errorMessage = '';
  let activeModalCleanup = null;

  const formData = {
    email: '',
    password: '',
  };

  function render() {
    container.innerHTML = `
      <div class="closed-beta-login-wrapper">
        <div class="closed-beta-login-card" role="main">
          
          <!-- الترويسة وشعار مِحْوَر -->
          <div class="auth-brand-header">
            <a href="#/" class="auth-brand-link" aria-label="العودة لصفحة مِحْوَر الرئيسية">
              ${officialMihwarLogoSvg}
              <span class="brand-name-ar">مِحْوَر</span>
              <span class="brand-divider">|</span>
              <span class="brand-name-en">Mihwar</span>
            </a>

            <div class="waitlist-badge-pill bidi-plaintext" dir="ltr">
              <span class="waitlist-amber-dot"></span>
              <span>CLOSED BETA • EARLY ACCESS</span>
            </div>

            <h1 class="waitlist-title" style="margin-top: 4px;">تسجيل الدخول</h1>
            <p class="waitlist-subtitle">الوصول مقتصر حالياً على طلبة الجامعات المسجلين في الدفعة الأولى.</p>
          </div>

          <!-- شريط الأخطاء بتوكن المرجان -->
          ${
            errorMessage
              ? `
                <div class="waitlist-error-banner" role="alert">
                  <span class="error-banner-icon">${icons.alertTriangle(16)}</span>
                  <div class="error-banner-content">
                    <span class="error-text">${escapeHtml(errorMessage)}</span>
                  </div>
                </div>
              `
              : ''
          }

          <!-- نموذج تسجيل الدخول الصارم (صفر تسجيل مفتوح) -->
          <form id="closed-beta-login-form" class="waitlist-form" novalidate>
            <div class="waitlist-field-group">
              <label class="waitlist-label" for="login-email">البريد الإلكتروني *</label>
              <input 
                type="email" 
                id="login-email" 
                name="email" 
                class="waitlist-input bidi-plaintext" 
                dir="ltr" 
                placeholder="name@university.edu" 
                value="${escapeHtml(formData.email)}" 
                maxlength="254" 
                required 
                autocomplete="email"
              />
            </div>

            <div class="waitlist-field-group">
              <label class="waitlist-label" for="login-password">كلمة المرور *</label>
              <input 
                type="password" 
                id="login-password" 
                name="password" 
                class="waitlist-input bidi-plaintext" 
                dir="ltr" 
                placeholder="••••••••" 
                value="${escapeHtml(formData.password)}" 
                required 
                autocomplete="current-password"
              />
            </div>

            <div class="waitlist-actions">
              <button type="submit" class="waitlist-submit-btn" ${isSubmitting ? 'disabled' : ''}>
                ${isSubmitting ? icons.clock(18) : icons.shieldCheck(18)}
                <span>${isSubmitting ? 'جاري التحقق والدخول...' : 'تسجيل الدخول للنظام'}</span>
              </button>
            </div>
          </form>

          <!-- التوجيهات السياقية للبيتا المغلقة -->
          <div class="auth-closed-beta-footer">
            <div class="beta-footer-route">
              <span>تم اعتماد تذكرتك بالدفعة الأولى؟</span>
              <button type="button" class="activation-switch-btn" id="btn-login-activate">
                فعّل مقعدك الآن
              </button>
            </div>

            <div class="beta-footer-route">
              <span>لم تسجل في قائمة الانتظار بعد؟</span>
              <button type="button" class="activation-switch-btn" id="btn-login-waitlist">
                احجز مقعدك
              </button>
            </div>

            <a href="#/" class="auth-back-landing-link">
              <span aria-hidden="true">&rarr;</span>
              <span>العودة لصفحة الهبوط</span>
            </a>
          </div>

        </div>
      </div>
    `;

    // ربط مسارات البيتا المغلقة
    const activateBtn = container.querySelector('#btn-login-activate');
    if (activateBtn) {
      activateBtn.addEventListener('click', () => {
        if (activeModalCleanup) activeModalCleanup();
        activeModalCleanup = openActivationModal({ initialEmail: formData.email });
      });
    }

    const waitlistBtn = container.querySelector('#btn-login-waitlist');
    if (waitlistBtn) {
      waitlistBtn.addEventListener('click', () => {
        if (activeModalCleanup) activeModalCleanup();
        activeModalCleanup = openWaitlistModal({ initialEmail: formData.email });
      });
    }

    // معالجة إرسال النموذج
    const form = container.querySelector('#closed-beta-login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const formElements = form.elements;
        formData.email = formElements.email ? formElements.email.value : '';
        formData.password = formElements.password ? formElements.password.value : '';

        const cleanEmail = sanitizeInput(formData.email).toLowerCase();
        const rawPassword = formData.password;

        if (!cleanEmail || !rawPassword) {
          errorMessage = 'يرجى إدخال البريد الإلكتروني وكلمة المرور.';
          render();
          return;
        }

        isSubmitting = true;
        errorMessage = '';
        render();

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: rawPassword,
          });

          if (error) {
            errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من صحة بياناتك.';
            isSubmitting = false;
            render();
            return;
          }

          // تسجيل الدخول ناجح: الراوتر سيتولى الدخول للداشبورد أو التهيئة
          window.location.hash = '#/dashboard';
        } catch (err) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من صحة بياناتك.';
          isSubmitting = false;
          render();
        }
      });
    }
  }

  render();

  return function cleanupLoginPage() {
    if (activeModalCleanup) activeModalCleanup();
  };
}

export { renderLoginPage as renderAuthPage };
