// src/pages/LandingPage.js
// صفحة الهبوط الرسمية لنظام "مِحْوَر | Mihwar"
// مصممة بأسلوب SaaS-Grade حديث مع دعم الثيمين الداكن والفاتح ومعاينة تفاعلية للواجهة

import { icons } from '../utils/icons.js';
import { getTheme, toggleTheme } from '../utils/theme.js';
import { signInWithGoogle } from '../api/auth.js';
import { escapeHtml } from '../utils/sanitize.js';

/**
 * دالة رسم صفحة الهبوط
 * @param {HTMLElement} container - عنصر الحاوية الرئيسي (#app)
 * @param {Object} options
 * @param {Object|null} options.user - كائن المستخدم في حال وجود جلسة نشطة
 */
export function renderLandingPage(container, { user = null } = {}) {
  const isAuthenticated = Boolean(user);
  const userInitial = user?.email ? user.email.trim().charAt(0).toUpperCase() : 'U';

  container.innerHTML = `
    <div class="landing-wrapper">
      <!-- هالة الإضاءة الخلفية (Ambient Glow) -->
      <div class="landing-ambient-glow" aria-hidden="true"></div>

      <!-- شريط التنقل العلوي (Navbar) -->
      <header class="landing-navbar">
        <div class="landing-container landing-navbar-inner">
          <a href="#/" class="landing-brand">
            <span class="landing-brand-icon">${icons.academicCap(24)}</span>
            <span class="landing-brand-text">مِحْوَر <span class="landing-brand-sub">| Mihwar</span></span>
          </a>

          <div class="landing-nav-actions">
            <button
              type="button"
              id="landing-theme-toggle"
              class="theme-toggle-btn"
              title="تبديل المظهر"
              aria-label="تبديل المظهر"
            ></button>

            ${
              isAuthenticated
                ? `
                  <a href="#/dashboard" class="btn-primary landing-nav-cta">
                    ${icons.layoutDashboard(16)}
                    <span>لوحة التحكم</span>
                    <span class="landing-user-badge" title="${escapeHtml(user?.email || '')}">${escapeHtml(userInitial)}</span>
                  </a>
                `
                : `
                  <a href="#/login" class="btn-secondary landing-nav-login">
                    تسجيل الدخول
                  </a>
                `
            }
          </div>
        </div>
      </header>

      <!-- القسم الرئيسي (Hero Section) -->
      <main class="landing-main">
        <section class="landing-hero">
          <div class="landing-container landing-hero-content">
            <!-- شارة البداية المتوهجة -->
            <div class="landing-badge animate-fade-in-up">
              <span class="landing-badge-pulse" aria-hidden="true"></span>
              <span class="landing-badge-text">نظام إدارة الدراسة الجامعية الذكي</span>
            </div>

            <!-- العنوان الرئيسي -->
            <h1 class="landing-hero-title animate-fade-in-up delay-100">
              مِحْوَر <span class="landing-title-sep">|</span> <span class="landing-title-gradient">مركز التحكم الكامل</span> لرحلتك الأكاديمية
            </h1>

            <!-- الوصف التسويقي -->
            <p class="landing-hero-desc animate-fade-in-up delay-200">
              منصة دراسية ذكية تتكيف مع أوقات تفرغك، صعوبة مساقاتك، ومواعيد امتحاناتك لتوليد خطة دراسية متوازنة وتتبع إنجازك الفعلي لحظة بلحظة دون إجهاد.
            </p>

            <!-- أزرار الدعوة للإجراء (Hero CTAs) -->
            <div class="landing-hero-ctas animate-fade-in-up delay-300">
              ${
                isAuthenticated
                  ? `
                    <a href="#/dashboard" class="btn-primary landing-cta-primary btn-shimmer">
                      ${icons.layoutDashboard(18)}
                      <span>الانتقال إلى لوحة التحكم</span>
                      ${icons.arrowLeft(16)}
                    </a>
                  `
                  : `
                    <button type="button" id="landing-hero-google-btn" class="landing-btn-google btn-shimmer">
                      ${icons.google(20)}
                      <span>ابدأ الآن مجاناً باستخدام Google</span>
                    </button>
                    <a href="#/login" class="btn-secondary landing-cta-secondary">
                      <span>تسجيل الدخول بالبريد</span>
                      ${icons.arrowLeft(16)}
                    </a>
                  `
              }
            </div>

            <div id="landing-auth-msg" class="landing-auth-error" style="display:none;" role="alert"></div>

            <!-- معاينة تفاعلية للنظام (Interactive UI Mockup) -->
            <div class="landing-mockup-wrapper animate-fade-in-up delay-400">
              <div class="landing-mockup-card mockup-window animate-float">
                <!-- شريط ترويسة النافذة -->
                <div class="landing-mockup-header">
                  <div class="landing-mockup-dots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                  <div class="landing-mockup-title">
                    ${icons.target(14)}
                    <span>معاينة حية — لوحة تحكم الطالب وجلسة اليوم</span>
                  </div>
                  <div class="landing-mockup-live-indicator">
                    <span class="mockup-live-dot"></span>
                    <span>مباشر</span>
                  </div>
                </div>

                <!-- جسم المعاينة -->
                <div class="landing-mockup-body">
                  <!-- كرت الجلسة النشطة -->
                  <div class="landing-mockup-session-box">
                    <div class="mockup-session-top">
                      <div class="mockup-session-meta">
                        <span class="mockup-course-tag">CS201</span>
                        <h4 class="mockup-course-name">هياكل البيانات والخوارزميات</h4>
                      </div>
                      <span class="mockup-reason-badge">
                        ${icons.zap(13)}
                        <span>امتحان قريب — تكثيف تلقائي</span>
                      </span>
                    </div>

                    <div class="mockup-session-center">
                      <div class="mockup-topic-info">
                        <span class="mockup-topic-label">نقطة التوقف الحالية:</span>
                        <div class="mockup-topic-title">
                          ${icons.folderTree(15)}
                          <span>الوحدة 3: أشجار البحث الثنائية (Binary Search Trees) — المحاضرة 4</span>
                        </div>
                        <div class="mockup-progress-wrap">
                          <div class="mockup-progress-bar" style="width: 68%;"></div>
                        </div>
                        <span class="mockup-progress-text">تم إنجاز 68% من محتوى المساق</span>
                      </div>

                      <div class="mockup-timer-box">
                        <div class="mockup-timer-clock" id="landing-mockup-timer">00:42:18</div>
                        <span class="mockup-timer-status">
                          <span class="mockup-live-dot"></span>
                          <span>المؤقت قيد التسجيل الحقيقي</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- مصغر الجدول التالي -->
                  <div class="mockup-bottom-bar">
                    <div class="mockup-next-session">
                      <span class="mockup-next-label">الجلسة التالية اليوم:</span>
                      <span class="mockup-next-detail">06:00 م – 07:30 م | نظم قواعد البيانات (SQL Optimization)</span>
                    </div>
                    <div class="mockup-verified-badge">
                      ${icons.check(14)}
                      <span>تم التحقق: 0 تعارض زمني</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- شريط القيمة السريعة (Value Strip) -->
            <div class="landing-value-strip animate-fade-in-up delay-500">
              <div class="landing-value-item">
                <div class="value-item-icon">${icons.check(18)}</div>
                <div class="value-item-content">
                  <strong>0 تعارض زمني</strong>
                  <span>خوارزمية ذكية تمنع تداخل الجلسات تماماً</span>
                </div>
              </div>
              <div class="landing-value-divider" aria-hidden="true"></div>
              <div class="landing-value-item">
                <div class="value-item-icon">${icons.barChart(18)}</div>
                <div class="value-item-content">
                  <strong>100% توزيع تلقائي عادل</strong>
                  <span>بناءً على صعوبة المواد وساعات تفرغك</span>
                </div>
              </div>
              <div class="landing-value-divider" aria-hidden="true"></div>
              <div class="landing-value-item">
                <div class="value-item-icon">${icons.clock(18)}</div>
                <div class="value-item-content">
                  <strong>تتبع حقيقي لساعات الإنجاز</strong>
                  <span>مقارنة الساعات الفعلية بالأهداف الأسبوعية</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- شبكة الركائز الأساسية (Core Pillars Grid) -->
        <section class="landing-features-section">
          <div class="landing-container">
            <div class="landing-section-header">
              <span class="landing-section-eyebrow">الركائز الأساسية</span>
              <h2 class="landing-section-title">كل ما تحتاجه لتفوق دراسي منظم وبدون إجهاد</h2>
              <p class="landing-section-desc">صممت كل أداة في مِحْوَر لحل مشكلة واقعية يواجهها الطالب الجامعي يومياً.</p>
            </div>

            <div class="landing-pillars-grid">
              <!-- ركيزة 1: محرك الجدولة التكيفي -->
              <div class="landing-pillar-card">
                <div class="pillar-icon-box">
                  ${icons.calendar(26)}
                </div>
                <h3 class="pillar-title">محرك الجدولة التكيفي</h3>
                <p class="pillar-desc">
                  توزيع ذكي وتلقائي لجلسات المذاكرة بناءً على أوقات فراغك الحقيقية، مع احتساب معاملات صعوبة المساقات وتكثيف المذاكرة قبل الامتحانات مع ضمان منع أي تعارض زمني.
                </p>
                <div class="pillar-tags">
                  <span class="pillar-tag">توزيع متوازن</span>
                  <span class="pillar-tag">فحص التعارضات</span>
                  <span class="pillar-tag">خوارزمية ذكية</span>
                </div>
              </div>

              <!-- ركيزة 2: شجرة المنهج ونقطة التوقف -->
              <div class="landing-pillar-card">
                <div class="pillar-icon-box">
                  ${icons.folderTree(26)}
                </div>
                <h3 class="pillar-title">شجرة المنهج ونقطة التوقف</h3>
                <p class="pillar-desc">
                  تنظيم هرمي لدروس ووحدات كل مساق الدراسي، مع تحديد دقيق لموضع توقفك الحالي، لتستأنف دراستك بنقرة واحدة دون تشتت أو ضياع الوقت في البحث.
                </p>
                <div class="pillar-tags">
                  <span class="pillar-tag">هيكلية شجرية</span>
                  <span class="pillar-tag">مؤشر الموضع</span>
                  <span class="pillar-tag">استئناف فوري</span>
                </div>
              </div>

              <!-- ركيزة 3: المؤقت الذكي وسجل الإنجاز -->
              <div class="landing-pillar-card">
                <div class="pillar-icon-box">
                  ${icons.clock(26)}
                </div>
                <h3 class="pillar-title">المؤقت الذكي وسجل الإنجاز</h3>
                <p class="pillar-desc">
                  مؤقت تركيز حي مدمج لتسجيل الجلسات المنجزة، مع مقارنة الساعات الفعلية مقابل طاقتك الاستيعابية الأسبوعية ورسم بياني لنسق الإنجاز التراكمي.
                </p>
                <div class="pillar-tags">
                  <span class="pillar-tag">جلسات حية</span>
                  <span class="pillar-tag">مقارنة الطاقة</span>
                  <span class="pillar-tag">تحليل بياني</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- تذييل الصفحة (Footer) -->
      <footer class="landing-footer">
        <div class="landing-container landing-footer-inner">
          <div class="landing-footer-brand">
            <span class="landing-footer-icon">${icons.academicCap(18)}</span>
            <span>مِحْوَر | Mihwar</span>
          </div>
          <p class="landing-footer-copy">
            © 2026 مِحْوَر — بُني لتطوير التجربة الأكاديمية الجامعية
          </p>
          <div class="landing-footer-links">
            <a href="#/" class="landing-footer-link">الرئيسية</a>
            ${isAuthenticated ? '<a href="#/dashboard" class="landing-footer-link">لوحة التحكم</a>' : '<a href="#/login" class="landing-footer-link">تسجيل الدخول</a>'}
          </div>
        </div>
      </footer>
    </div>
  `;

  // إعداد زر المظهر (Dark / Light Theme Toggle)
  let onThemeChange = null;
  const themeToggleBtn = container.querySelector('#landing-theme-toggle');
  if (themeToggleBtn) {
    function updateThemeIcon() {
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

    updateThemeIcon();

    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      updateThemeIcon();
    });

    onThemeChange = () => updateThemeIcon();
    window.addEventListener('theme-changed', onThemeChange);
  }

  // ربط زر تسجيل الدخول عبر Google
  const googleBtn = container.querySelector('#landing-hero-google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const errEl = container.querySelector('#landing-auth-msg');
      if (errEl) errEl.style.display = 'none';

      googleBtn.disabled = true;
      googleBtn.innerHTML = `<span>جاري الاتصال بـ Google...</span>`;

      try {
        await signInWithGoogle();
      } catch (err) {
        console.error('Google Sign-In failed:', err);
        googleBtn.disabled = false;
        googleBtn.innerHTML = `${icons.google(20)}<span>ابدأ الآن مجاناً باستخدام Google</span>`;
        if (errEl) {
          errEl.textContent = err.message || 'تعذر الاتصال بخدمة Google. يرجى المحاولة لاحقاً أو استخدام البريد الإلكتروني.';
          errEl.style.display = 'block';
        }
      }
    });
  }

  // تشغيل عداد الثواني الحي في الموك أب (Live Ascending Counter)
  let timerSeconds = 42 * 60 + 18; // البداية: 00:42:18
  const timerEl = container.querySelector('#landing-mockup-timer') || container.querySelector('.mockup-timer-clock');
  let timerInterval = null;

  if (timerEl) {
    timerInterval = setInterval(() => {
      // حماية دفاعية: لو تم مسح العنصر من الـ DOM يتم إيقاف المؤقت فوراً
      if (!document.body.contains(timerEl)) {
        clearInterval(timerInterval);
        timerInterval = null;
        return;
      }
      timerSeconds++;
      const hrs = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(timerSeconds % 60).padStart(2, '0');
      timerEl.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  // مراقب السكرول لظهور كروت الركائز الأساسية بتتابع (Scroll Reveal)
  let observer = null;
  const pillarCards = container.querySelectorAll('.landing-pillar-card');
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    pillarCards.forEach((card, index) => {
      card.style.transitionDelay = `${index * 150}ms`;
      observer.observe(card);
    });
  } else {
    pillarCards.forEach((card) => card.classList.add('is-visible'));
  }

  // إرجاع دالة تنظيف كاملة لمنع تسريب الذاكرة (Memory Leak Prevention)
  return () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (onThemeChange) {
      window.removeEventListener('theme-changed', onThemeChange);
      onThemeChange = null;
    }
  };
}

