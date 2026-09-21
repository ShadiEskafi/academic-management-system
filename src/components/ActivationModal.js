// src/components/ActivationModal.js
// نافذة تفعيل مقاعد الدفعة الأولى وتعيين كلمة المرور للطلبة المعتمدين (Early Access Activation Modal)

import { supabase } from '../api/supabaseClient.js';
import { icons } from '../utils/icons.js';
import { escapeHtml, sanitizeInput, isValidEmail } from '../utils/sanitize.js';
import { openWaitlistModal } from './WaitlistModal.js';

/**
 * فتح نافذة تفعيل الحساب للطلبة المعتمدين في قائمة الانتظار
 * @param {Object} [options]
 * @param {string} [options.initialEmail]
 * @returns {Function} cleanup
 */
export function openActivationModal({ initialEmail = '' } = {}) {
  // إزالة أي مودال سابق مفتوح (سواء تفعيل أو قائمة انتظار) لمنع تداخل الطبقات
  const existing = document.getElementById('activation-modal-root');
  if (existing) existing.remove();

  const waitlistExisting = document.getElementById('waitlist-modal-root');
  if (waitlistExisting) waitlistExisting.remove();

  const modalRoot = document.createElement('div');
  modalRoot.id = 'activation-modal-root';
  modalRoot.className = 'waitlist-modal-overlay';
  document.body.appendChild(modalRoot);

  // حالة المكون المحلية (Local Component State)
  let isSubmitting = false;
  let errorMessage = '';
  let errorType = 'generic'; // 'generic' | 'unapproved' | 'already_registered'

  // نموذج الحقول
  const formData = {
    email: initialEmail,
    password: '',
    confirmPassword: '',
  };

  function closeModal() {
    window.removeEventListener('keydown', handleKeyDown);
    modalRoot.classList.add('is-closing');
    setTimeout(() => {
      if (document.body.contains(modalRoot)) {
        modalRoot.remove();
      }
    }, 200);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function render() {
    modalRoot.innerHTML = `
      <div class="waitlist-modal-card" role="dialog" aria-modal="true" aria-labelledby="activation-modal-title">
        <button type="button" class="waitlist-close-btn" aria-label="إغلاق النافذة">
          ${icons.x(18)}
        </button>

        <div class="waitlist-header">
          <div class="waitlist-badge-pill bidi-plaintext" dir="ltr">
            <span class="waitlist-amber-dot"></span>
            <span>MIHWAR • ACCOUNT ACTIVATION</span>
          </div>
          <h2 id="activation-modal-title" class="waitlist-title">تفعيل مقعدك في التجربة الأولى</h2>
          <p class="waitlist-subtitle">أهلاً بك! إذا كان مقعدك معتمداً، عيّن كلمة المرور الخاصة بحسابك للدخول إلى النظام الأكاديمي مباشرة.</p>
        </div>

        ${
          errorMessage
            ? `
              <div class="waitlist-error-banner" role="alert">
                <span class="error-banner-icon">${icons.alertTriangle(16)}</span>
                <div class="error-banner-content">
                  <span class="error-text">${escapeHtml(errorMessage)}</span>
                  ${
                    errorType === 'already_registered'
                      ? `
                        <div>
                          <button type="button" class="waitlist-quick-login-link" id="btn-quick-login">
                            <span>تسجيل الدخول إلى حسابك الآن</span>
                            <span aria-hidden="true">&larr;</span>
                          </button>
                        </div>
                      `
                      : ''
                  }
                </div>
              </div>
            `
            : ''
        }

        <form id="activation-form" class="waitlist-form" novalidate>
          <div class="waitlist-field-group">
            <label class="waitlist-label" for="activation-email">البريد الإلكتروني المعتمد *</label>
            <input 
              type="email" 
              id="activation-email" 
              name="email" 
              class="waitlist-input bidi-plaintext" 
              dir="ltr" 
              placeholder="name@university.edu" 
              value="${escapeHtml(formData.email)}" 
              maxlength="254" 
              required 
              autocomplete="email"
            />
            <span class="waitlist-help-text">يجب أن يتطابق مع نفس البريد الذي تم حجز التذكرة به.</span>
          </div>

          <div class="waitlist-field-group">
            <label class="waitlist-label" for="activation-password">كلمة المرور الجديدة *</label>
            <input 
              type="password" 
              id="activation-password" 
              name="password" 
              class="waitlist-input bidi-plaintext" 
              dir="ltr" 
              placeholder="••••••••" 
              value="${escapeHtml(formData.password)}" 
              minlength="8" 
              required 
              autocomplete="new-password"
            />
            <span class="waitlist-help-text">الحد الأدنى 8 خانات تتضمن حروفاً وأرقاماً.</span>
          </div>

          <div class="waitlist-field-group">
            <label class="waitlist-label" for="activation-confirm-password">تأكيد كلمة المرور *</label>
            <input 
              type="password" 
              id="activation-confirm-password" 
              name="confirmPassword" 
              class="waitlist-input bidi-plaintext" 
              dir="ltr" 
              placeholder="••••••••" 
              value="${escapeHtml(formData.confirmPassword)}" 
              minlength="8" 
              required 
              autocomplete="new-password"
            />
          </div>

          <div class="waitlist-actions">
            <button type="submit" class="waitlist-submit-btn" ${isSubmitting ? 'disabled' : ''}>
              ${isSubmitting ? icons.clock(18) : icons.shieldCheck(18)}
              <span>${isSubmitting ? 'جاري التحقق وتفعيل الحساب...' : 'تأكيد كلمة المرور وتفعيل الحساب'}</span>
            </button>
          </div>

          <div class="activation-footer-hint">
            <span>لديك حساب مفعّل بالفعل؟</span>
            <button type="button" class="activation-switch-btn" id="btn-switch-to-login">
              تسجيل الدخول
            </button>
          </div>

          <div class="activation-footer-hint">
            <span>لم تحجز مقعدك بعد؟</span>
            <button type="button" class="activation-switch-btn" id="btn-switch-to-waitlist">
              احجز مقعدك في التجربة الأولى
            </button>
          </div>
        </form>
      </div>
    `;

    // أحداث الإغلاق
    const closeBtn = modalRoot.querySelector('.waitlist-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modalRoot.addEventListener('click', (e) => {
      if (e.target === modalRoot) closeModal();
    });

    // زر التحويل لتسجيل الدخول
    const switchToLoginBtn = modalRoot.querySelector('#btn-switch-to-login');
    if (switchToLoginBtn) {
      switchToLoginBtn.addEventListener('click', () => {
        closeModal();
        window.location.hash = '#/login';
      });
    }

    // زر التحويل لتسجيل الدخول السريع في شريط الخطأ
    const quickLoginBtn = modalRoot.querySelector('#btn-quick-login');
    if (quickLoginBtn) {
      quickLoginBtn.addEventListener('click', () => {
        closeModal();
        window.location.hash = '#/login';
      });
    }


    // زر التحويل إلى حجز مقعد جديد في قائمة الانتظار
    const switchToWaitlistBtn = modalRoot.querySelector('#btn-switch-to-waitlist');
    if (switchToWaitlistBtn) {
      switchToWaitlistBtn.addEventListener('click', () => {
        const emailVal = formData.email ? sanitizeInput(formData.email) : '';
        closeModal();
        openWaitlistModal({ initialEmail: emailVal });
      });
    }

    // حدث إرسال النموذج
    const form = modalRoot.querySelector('#activation-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // منع التكرار في حال كان الطلب قيد المعالجة
        if (isSubmitting) return;

        const formElements = form.elements;
        formData.email = formElements.email ? formElements.email.value : '';
        formData.password = formElements.password ? formElements.password.value : '';
        formData.confirmPassword = formElements.confirmPassword ? formElements.confirmPassword.value : '';

        const cleanEmail = sanitizeInput(formData.email).toLowerCase();
        const rawPassword = formData.password;
        const rawConfirm = formData.confirmPassword;

        // التحقق التسلسلي
        if (!cleanEmail || !rawPassword || !rawConfirm) {
          errorMessage = 'يرجى إكمال جميع الحقول المطلوبة للمتابعة.';
          errorType = 'generic';
          render();
          return;
        }

        if (!isValidEmail(cleanEmail)) {
          errorMessage = 'يرجى إدخال عنوان بريد إلكتروني صحيح.';
          errorType = 'generic';
          render();
          return;
        }

        if (rawPassword.length < 8) {
          errorMessage = 'كلمة المرور يجب أن تتكون من 8 خانات على الأقل.';
          errorType = 'generic';
          render();
          return;
        }

        if (rawPassword !== rawConfirm) {
          errorMessage = 'كلمتا المرور غير متطابقتين. يرجى إعادة التأكد.';
          errorType = 'generic';
          render();
          return;
        }

        isSubmitting = true;
        errorMessage = '';
        errorType = 'generic';
        render();

        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: rawPassword,
          });

          if (error) {
            let userMessage = 'عذراً، هذا البريد غير مدرج ضمن مقاعد الدفعة الأولى المعتمدة. تأكد من إدخال نفس البريد الذي حجزت به التذكرة.';
            let isAlreadyRegistered = false;

            if (error?.message) {
              const msg = error.message.toLowerCase();
              if (
                msg.includes('already registered') ||
                msg.includes('user_already_exists') ||
                msg.includes('already exists') ||
                msg.includes('user already')
              ) {
                userMessage = 'هذا الحساب مفعّل مسبقاً. يمكنك تسجيل الدخول مباشرة إلى حسابك.';
                isAlreadyRegistered = true;
              } else if (msg.includes('password') && msg.includes('short')) {
                userMessage = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.';
              }
            }

            errorMessage = userMessage;
            errorType = isAlreadyRegistered ? 'already_registered' : 'unapproved';
            isSubmitting = false;
            render();
            return;
          }

          // تم التفعيل بنجاح!
          closeModal();
          // الانتقال التلقائي للداشبورد (حيث يتولى الراوتر فحص حالة Onboarding والدخول)
          window.location.hash = '#/dashboard';
        } catch (err) {
          let userMessage = 'عذراً، هذا البريد غير مدرج ضمن مقاعد الدفعة الأولى المعتمدة. تأكد من إدخال نفس البريد الذي حجزت به التذكرة.';
          let isAlreadyRegistered = false;

          if (err?.message) {
            const msg = err.message.toLowerCase();
            if (
              msg.includes('already registered') ||
              msg.includes('user_already_exists') ||
              msg.includes('already exists') ||
              msg.includes('user already')
            ) {
              userMessage = 'هذا الحساب مفعّل مسبقاً. يمكنك تسجيل الدخول مباشرة إلى حسابك.';
              isAlreadyRegistered = true;
            } else if (msg.includes('password') && msg.includes('short')) {
              userMessage = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.';
            }
          }

          errorMessage = userMessage;
          errorType = isAlreadyRegistered ? 'already_registered' : 'unapproved';
          isSubmitting = false;
          render();
        }

      });
    }
  }

  render();

  return function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (document.body.contains(modalRoot)) {
      modalRoot.remove();
    }
  };
}

