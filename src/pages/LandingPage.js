// src/pages/LandingPage.js
// صفحة الهبوط الرسمية لنظام "مِحْوَر | Mihwar"
// هندسة بصرية فائقة الدقة بنمط SaaS العالمي (Linear × Mintlify × Hellotime)
// وضع داكن حصري، ودجات تفاعلية حقيقية (Micro-UI Widgets)، أرقام جدولية، وعزل اتجاهي BiDi صارم

import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';
import { openWaitlistModal } from '../components/WaitlistModal.js';
import { openActivationModal } from '../components/ActivationModal.js';

// شعار مِحْوَر الفيكتوري الرسمي المعتمد (Official Mihwar Vector Logo)
const officialMihwarLogoSvg = `
  <svg class="landing-brand-logo" viewBox="0 0 606 481" width="28" height="23" fill="none" aria-hidden="true">
    <path d="M329.556 3.23995C382.302 12.484 426.347 37.4974 459.517 77.0567C480.452 102.07 495.406 133.473 502.339 167.051C505.873 183.636 505.873 224.826 502.475 239.78C496.222 267.648 487.521 288.175 472.568 310.47C462.78 325.016 438.31 348.942 421.453 360.089C413.84 365.119 407.315 369.061 407.043 368.653C406.771 368.381 408.131 366.342 410.17 364.167C415.2 358.594 423.492 348.126 430.154 339.154C460.605 297.555 474.335 253.102 470.121 210.144C463.867 145.708 427.842 92.6901 371.019 64.414C349.404 53.5387 328.604 47.965 300.328 45.3821C247.855 40.4882 187.904 61.4233 143.995 100.167C110.009 130.074 80.7814 177.926 70.7216 220.34C69.0903 227.001 68.1387 228.089 56.0398 238.013C29.2592 259.763 15.2571 271.59 7.64433 279.067C-1.46382 287.903 -1.46381 288.175 2.61446 265.337C8.32404 232.983 12.2664 218.573 22.3261 192.88C39.9986 148.155 65.148 110.227 97.7742 78.824C135.838 42.3914 178.932 18.7374 230.318 5.9588C258.322 -0.838327 299.105 -1.92587 329.556 3.23995Z" fill="#F5A622"/>
    <path d="M197.556 114.985C188.176 125.045 185.593 128.171 176.757 139.863C156.501 166.915 144.81 192.2 138.557 223.467C133.663 246.985 135.43 282.738 142.499 306.256C156.909 354.244 193.614 396.794 238.475 417.865C267.294 431.323 294.075 436.489 327.925 435.13C358.648 433.77 384.885 427.245 412.481 413.787C432.736 403.999 450.273 391.492 468.625 373.82C491.192 352.069 503.155 335.756 518.788 305.305C524.226 294.837 534.014 268.192 536.053 257.997C536.868 254.462 541.762 249.704 561.066 233.527C574.253 222.38 589.614 209.057 594.916 203.891C600.353 198.726 605.111 194.783 605.383 195.055C605.791 195.327 605.519 198.318 604.84 201.716C604.16 205.115 601.985 216.398 600.082 226.866C590.022 280.427 567.727 330.726 536.868 369.741C495.678 421.671 438.582 459.327 379.175 473.465C357.968 478.495 351.443 479.311 325.886 479.991C305.766 480.534 296.93 480.262 284.423 478.359C222.162 469.251 170.096 437.577 135.43 387.686C126.458 374.771 115.583 352.884 110.145 336.979C95.0553 291.846 96.6866 243.859 114.767 201.58C124.283 179.558 137.469 160.798 156.501 142.445C170.096 129.395 195.245 111.179 200.275 110.771C201.09 110.635 199.731 112.674 197.556 114.985Z" fill="#F5A622"/>
    <path d="M303.455 295.38C334.162 295.38 359.055 270.487 359.055 239.78C359.055 209.072 334.162 184.179 303.455 184.179C272.747 184.179 247.854 209.072 247.854 239.78C247.854 270.487 272.747 295.38 303.455 295.38Z" fill="#FF6B5E"/>
  </svg>
`;

/**
 * دالة رسم صفحة الهبوط
 * @param {HTMLElement} container - عنصر الحاوية الرئيسي (#app)
 * @returns {Function} cleanup - دالة تنظيف لإيقاف المؤقت وفك الارتباطات ومنع تسريب الذاكرة
 */
export function renderLandingPage(container, _options = {}) {
  // فرض الثيم الداكن حصرياً داخل صفحة الهبوط مع حفظ الثيم السابق للاستعادة
  const prevTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'dark');

  container.innerHTML = `
    <div class="landing-page">
      <!-- طبقة الإضاءة وشبكة النقاط التفاعلية (Interactive Spotlight & Fading Dot Matrix) -->
      <div class="landing-spotlight-layer" aria-hidden="true">
        <div class="spotlight-glow"></div>
        <div class="spotlight-dots"></div>
      </div>

      <!-- شريط الترويسة (Precision Pre-Launch Navbar) -->
      <header class="landing-navbar">
        <div class="landing-container landing-navbar-inner">
          <a href="#/" class="landing-brand" aria-label="مِحْوَر | Mihwar">
            ${officialMihwarLogoSvg}
            <span class="brand-name-ar">مِحْوَر</span>
            <span class="brand-divider">|</span>
            <span class="brand-name-en">Mihwar</span>
          </a>

          <!-- روابط أقسام الصفحة الانسيابية (Desktop Navigation) -->
          <nav class="landing-nav-links" aria-label="أقسام الصفحة">
            <a href="#capacity-section" class="landing-nav-link" data-scroll-to="capacity-section">تنظيم الأسبوع</a>
            <a href="#checkpoint-section" class="landing-nav-link" data-scroll-to="checkpoint-section">تقسيم المواد</a>
            <a href="#crunch-section" class="landing-nav-link" data-scroll-to="crunch-section">ميزان الامتحانات</a>
            <a href="#audit-section" class="landing-nav-link" data-scroll-to="audit-section">ليش مِحْوَر؟</a>
            <a href="#faq-section" class="landing-nav-link" data-scroll-to="faq-section">الأسئلة الشائعة</a>
          </nav>

          <!-- إجراءات الحجز والتفعيل في الترويسة (3-Tier Hierarchy) -->
          <div class="landing-nav-actions">
            <a href="#/login" class="landing-nav-ghost-link">
              <span class="nav-ghost-full">تسجيل الدخول</span>
              <span class="nav-ghost-compact">دخول</span>
            </a>
            <button type="button" class="landing-nav-secondary-btn" data-action="open-activation">
              <span class="nav-secondary-full">تفعيل مقعدك</span>
              <span class="nav-secondary-compact">تفعيل</span>
            </button>
            <button type="button" class="landing-nav-pill-btn" data-action="open-waitlist">
              <span class="pill-sparkle">${icons.sparkles(14)}</span>
              <span class="nav-pill-full">احجز مقعدك</span>
              <span class="nav-pill-compact">احجز</span>
              <span class="pill-arrow" aria-hidden="true">&larr;</span>
            </button>
            <!-- زر قائمة الموبايل -->
            <button class="landing-menu-toggle" id="landing-menu-toggle" type="button" aria-label="تبديل القائمة" aria-expanded="false">
              <svg class="hamburger-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <svg class="close-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:none;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

        </div>

        <!-- الدرج التفاعلي لشاشات الموبايل (Mobile Responsive Drawer) -->
        <div id="landing-mobile-drawer" class="landing-mobile-drawer" aria-hidden="true">
          <nav class="landing-drawer-nav" aria-label="روابط الموبايل">
            <a href="#capacity-section" class="landing-drawer-link" data-scroll-to="capacity-section">تنظيم الأسبوع</a>
            <a href="#checkpoint-section" class="landing-drawer-link" data-scroll-to="checkpoint-section">تقسيم المواد</a>
            <a href="#crunch-section" class="landing-drawer-link" data-scroll-to="crunch-section">ميزان الامتحانات</a>
            <a href="#audit-section" class="landing-drawer-link" data-scroll-to="audit-section">ليش مِحْوَر؟</a>
            <a href="#faq-section" class="landing-drawer-link" data-scroll-to="faq-section">الأسئلة الشائعة</a>
          </nav>
          <div class="landing-drawer-divider"></div>
          <div class="landing-drawer-actions">
            <a href="#/login" class="landing-drawer-ghost-link">
              ${icons.user(16)}
              <span>تسجيل الدخول</span>
            </a>
            <button type="button" class="landing-drawer-secondary-btn" data-action="open-activation">
              <span>تفعيل مقعدك</span>
            </button>
            <button type="button" class="landing-drawer-pill-btn" data-action="open-waitlist">
              <span class="pill-sparkle">${icons.sparkles(16)}</span>
              <span>احجز مقعدك وابدأ مجاناً</span>
              <span class="pill-arrow" aria-hidden="true">&larr;</span>
            </button>
          </div>
        </div>
      </header>

      <!-- المحتوى الرئيسي لصفحة الهبوط -->
      <main class="landing-main">

        <!-- القسم التمهيدي: الهيرو والواجهة الحية العائمة (Hero & Floating HUD) -->
        <section class="landing-hero">
          <div class="landing-container">
            
            <!-- شارة الحالة الذكية للطلاب -->
            <div class="hero-badge">
              <span class="pilot-lamp" aria-hidden="true"></span>
              <span>النظام الأكاديمي الأذكى لطلاب الجامعات</span>
            </div>

            <!-- العنوان الرئيسي الأنيق المتدرج -->
            <h1 class="hero-title">
              ادرس بذكاء..<br>
              <span class="hero-title-gradient">وخلّص موادك بدون زنقة الامتحانات.</span>
            </h1>

            <!-- الوصف المباشر والواضح -->
            <p class="hero-desc">
              بدل ما تضل تايه بين سلايدات الـ 400 صفحة وتتفاجأ ليلة الامتحان.. مِحْوَر بفككلك موادك لمحطات صغيرة، بحسبلك علامات كل درس، وبوزع دراستك ع الأسبوع بروقان.
            </p>

            <!-- أزرار الدعوة للإجراء -->
            <div class="hero-ctas">
              <button type="button" class="landing-waitlist-pill-btn" data-action="open-waitlist">
                <span class="pill-sparkle">${icons.sparkles(16)}</span>
                <span>بلّش نظّم فصلك هلقيت (مجاناً)</span>
                <span class="pill-arrow" aria-hidden="true">&larr;</span>
              </button>
              <a href="#checkpoint-section" class="saas-btn-secondary" data-scroll-to="checkpoint-section">
                <span>استكشف ميزات النظام</span>
              </a>
              <div class="hero-cta-subnote bidi-plaintext" dir="ltr">
                BATCH-01 ACCESS &bull; LIMITED EARLY SEATS
              </div>
            </div>

            <!-- Micro-UI Widget: واجهة الجلسة الحية والمؤقت المتصاعد (Floating HUD Card) -->
            <div class="floating-hud-wrapper landing-reveal">
              <div class="floating-hud-card">
                <div class="hud-header-bar">
                  <div class="hud-dots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                  <div class="hud-title-text">
                    جلسة تركيز جارية
                  </div>
                </div>

                <div class="hud-body">
                  <div class="hud-session-panel">
                    <div class="hud-session-top">
                      <span class="hud-course-tag bidi-plaintext" dir="ltr">CS-301: DATA_STRUCTURES</span>
                      <span class="hud-crunch-badge">
                        ${icons.zap(13)}
                        <span>امتحان وشيك بعد 9 أيام (تركيز مضاعف)</span>
                      </span>
                    </div>

                    <div class="hud-session-main">
                      <div class="hud-topic-col">
                        <div class="hud-topic-breadcrumb">
                          الوحدة 3: الأشجار المتوازنة &larr; محاضرة 4: فحص اتزان الدوران (Rotation Check)
                        </div>
                        <div class="hud-progress-track">
                          <div class="hud-progress-fill" style="width: 68%;"></div>
                        </div>
                        <div class="hud-progress-label">
                          <span>إنجاز الدرس: 68%</span> &bull; <span>المتبقي: 18 دقيقة</span>
                        </div>
                      </div>

                      <!-- العداد الحي المتصاعد -->
                      <div class="hud-chrono-box">
                        <div id="landing-mockup-timer" class="mockup-timer-clock bidi-plaintext" dir="ltr">00:42:18</div>
                        <div class="hud-chrono-status">
                          <span class="pilot-lamp" aria-hidden="true"></span>
                          <span>مؤقت تركيز فعّال</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="hud-footer-strip">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${icons.calendar(14)}
                      <span>الجلسة القادمة: أنظمة التشغيل (OS) - اليوم 06:30 م</span>
                    </div>
                    <div style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald);">
                      مكان وقوفك محفوظ بالثانية
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- القسم 1: شريط الإثبات والمؤشرات (Student Outcomes Stats Bar) -->
        <section class="minimal-proof-strip landing-reveal" aria-label="مؤشرات أداء مِحْوَر للطلاب">
          <div class="landing-container">
            <div class="proof-strip-inner" style="justify-content: space-around;">
              <div class="proof-item">
                <span class="pilot-lamp" aria-hidden="true"></span>
                <strong style="color: var(--saas-amber); font-weight: 700; margin-inline-end: 4px;">+8 ساعات</strong>
                <span>توفير من السهر العشوائي أسبوعياً</span>
              </div>
              <span class="proof-sep" aria-hidden="true">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-cyan);" aria-hidden="true">&bull;</span>
                <strong style="color: var(--saas-cyan); font-weight: 700; margin-inline-end: 4px;">100%</strong>
                <span>مصمم للمواد الجامعية المضغوطة</span>
              </div>
              <span class="proof-sep" aria-hidden="true">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-emerald);" aria-hidden="true">&bull;</span>
                <strong style="color: var(--saas-emerald); font-weight: 700; margin-inline-end: 4px;">Batch-01</strong>
                <span>تفعيل فوري لمقاعد الدفعة الأولى</span>
              </div>
            </div>
          </div>
        </section>

        <!-- القسم 2: مصفوفة توزيع التفرغ الأسبوعي (Weekly Load Balancing) -->
        <section id="capacity-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow">[توزيع متوازن]</span>
              <h2 class="section-title">رتّب أسبوعك بدون وهم: «ملحوق وبدرس بكرة»</h2>
              <p class="section-subtext">
                كل يوم بنحكي "معي وقت بالويكند"، وفجأة بيجي الخميس وبنلاقي 4 كويزات وبروجكت نزلوا فوق راسنا! مِحْوَر بشوف أوقات فراغك الحقيقية وبوزع دراستك عليها بهدوء.. ساعتين باليوم بروقان، أحسن من سهرة رعب 14 ساعة قبل الامتحان.
              </p>
            </div>

            <div class="capacity-widget-card">
              <div class="capacity-grid">
                
                <!-- الأحد -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الأحد (SUN)</div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">08:00 - 10:00</strong>
                    <span>محاضرة جامعية: فيزياء</span>
                    <span style="font-size: 9px; opacity: 0.7;">[محاضرة جامعية مقفلة]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>استراحة وتفريغ ذهني (30 دقيقة)</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">10:30 - 12:30</strong>
                    <span>مِحْوَر: هياكل بيانات</span>
                    <span style="font-size: 9px; font-weight: 700;">[موزعة تلقائياً بروقان]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>فراغ جامعي</span>
                  </div>
                </div>

                <!-- الإثنين -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الإثنين (MON)</div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">09:00 - 11:00</strong>
                    <span>مِحْوَر: نظم تشغيل</span>
                    <span style="font-size: 9px; font-weight: 700;">[تركيز مكثف 2.5x]</span>
                  </div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">11:30 - 01:30</strong>
                    <span>مختبر برمجيات</span>
                    <span style="font-size: 9px; opacity: 0.7;">[مختبر مقفل]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>استراحة غداء</span>
                  </div>
                </div>

                <!-- الثلاثاء -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الثلاثاء (TUE)</div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">08:00 - 10:00</strong>
                    <span>محاضرة جامعية: فيزياء</span>
                    <span style="font-size: 9px; opacity: 0.7;">[محاضرة مقفلة]</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">10:30 - 12:00</strong>
                    <span>مِحْوَر: هندسة برمجيات</span>
                    <span style="font-size: 9px; font-weight: 700;">[توزيع متكافئ]</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">02:00 - 03:30</strong>
                    <span>مِحْوَر: احتمالات وإحصاء</span>
                    <span style="font-size: 9px; font-weight: 700;">[موزعة تلقائياً]</span>
                  </div>
                </div>

                <!-- الأربعاء -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الأربعاء (WED)</div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>فترة فراغ صباحية</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">10:00 - 12:30</strong>
                    <span>مِحْوَر: نظم تشغيل مكثف</span>
                    <span style="font-size: 9px; font-weight: 700;">[أولوية امتحان]</span>
                  </div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">01:00 - 03:00</strong>
                    <span>مشروع تخرج / تدريب</span>
                    <span style="font-size: 9px; opacity: 0.7;">[التزام مقفل]</span>
                  </div>
                </div>

                <!-- الخميس -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الخميس (THU)</div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">09:00 - 11:30</strong>
                    <span>مِحْوَر: مراجعة أسبوعية</span>
                    <span style="font-size: 9px; font-weight: 700;">[تثبيت وإنجاز]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>نهاية الأسبوع الأكاديمي بروقان</span>
                  </div>
                </div>

              </div>

              <div class="capacity-footer-bar">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="pilot-lamp" aria-hidden="true"></span>
                  <span>ساعات التفرغ المخصصة للدراسة: <strong>16.5 ساعة أسبوعياً</strong> موزعة بهدوء ومرونة.</span>
                </div>
                <div style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald);">
                  توزيع ذكي بدون أي تصادم مع محاضراتك الجامعية
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- القسم 3: شجرة تقسيم المواد واستئناف الدروس (Course Breakdown) -->
        <section id="checkpoint-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow">[تقسيم مريح]</span>
              <h2 class="section-title">المادة مش جبل مسكّر.. قسّمها لمحطات صغيرة</h2>
              <p class="section-subtext">
                أكبر سبب بخليك تأجل دراستك إنك بتفتح الملف وبتلاقيه 300 صفحة ورا بعض بتسد النفس! بمِحْوَر، المادة بتتقسم قدامك لدروس واضحة: بتعرف شو عليك اليوم، بتخلصه وبتشطبه، وبترفع نسبة إنجازك خطوة خطوة.
              </p>
            </div>

            <div class="tree-widget-card">
              <div class="tree-course-header">
                <div>
                  <h3 style="margin: 0 0 4px; font-size: 16px; color: var(--saas-text);">
                    خوارزميات وهياكل بيانات (CS-202)
                  </h3>
                  <span style="font-size: 12px; color: var(--saas-text-muted);">
                    الفصل الدراسي الحالي &bull; 4 ساعات معتمدة
                  </span>
                </div>
                <div style="font-family: var(--saas-font-mono); font-size: 12px; color: var(--saas-emerald); background: var(--saas-emerald-soft); padding: 4px 10px; border-radius: var(--saas-radius-sm); border: 1px solid var(--saas-border-emerald);">
                  نسبة الإنجاز: 74%
                </div>
              </div>

              <div class="tree-branch-group">
                
                <!-- الوحدة الأولى (مكتملة) -->
                <div class="tree-unit-row is-completed">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.check(15)}</span>
                    <span>الوحدة 1: تحليل تعقيد الخوارزميات (Asymptotic Notation)</span>
                  </div>
                  <span style="font-size: 11px; font-family: var(--saas-font-mono);">
                    [تم إنجاز 4/4 محاضرات]
                  </span>
                </div>

                <!-- الوحدة الثانية (مكتملة) -->
                <div class="tree-unit-row is-completed">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.check(15)}</span>
                    <span>الوحدة 2: هياكل البيانات المترابطة والقوائم والمكدسات (Stacks &amp; Queues)</span>
                  </div>
                  <span style="font-size: 11px; font-family: var(--saas-font-mono);">
                    [تم إنجاز 6/6 محاضرات]
                  </span>
                </div>

                <!-- الوحدة الثالثة (قيد التنفيذ وبها نقطة التوقف النشطة) -->
                <div class="tree-unit-row" style="border-color: var(--saas-border-emerald); color: var(--saas-text);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.folderTree(15)}</span>
                    <strong>الوحدة 3: الأشجار المتوازنة وأشجار البحث الثنائية (Balanced Trees)</strong>
                  </div>
                  <span style="font-size: 11px; font-family: var(--saas-font-mono); color: var(--saas-emerald);">
                    [المحطة الحالية &bull; 3 من 5]
                  </span>
                </div>

                <!-- تفريعات المحاضرات للوحدة الثالثة -->
                <div class="tree-sub-items">
                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-emerald);">${icons.check(14)}</span>
                      <span>محاضرة 1: خصائص Binary Search Trees والمطابقة الخطية</span>
                    </div>
                    <span style="color: var(--saas-emerald);">مكتملة</span>
                  </div>

                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-emerald);">${icons.check(14)}</span>
                      <span>محاضرة 2: شجرة AVL وحساب معامل التوازن (Balance Factor)</span>
                    </div>
                    <span style="color: var(--saas-emerald);">مكتملة</span>
                  </div>

                  <!-- العقدة النشطة (Active Checkpoint) -->
                  <div class="tree-lecture-node is-active-checkpoint">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="pilot-lamp" aria-hidden="true"></span>
                      <div>
                        <strong style="color: #ffffff;">محاضرة 3: الدوران الأحادي والمزدوج (Left/Right Rotations)</strong>
                        <div style="font-size: 11px; color: var(--saas-emerald); margin-top: 2px;">
                          آخر نقطة توقف محفوظة: الدقيقة 18:40 من أصل 35:00
                        </div>
                      </div>
                    </div>
                    <span class="tree-resume-pill">
                      مكان وقوفك محفوظ &bull; 18:40
                    </span>
                  </div>

                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-text-dim);">&bull;</span>
                      <span>محاضرة 4: أشجار Red-Black Trees ومقارنة التعقيد الزمني</span>
                    </div>
                    <span style="opacity: 0.5;">المحطة القادمة</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        <!-- القسم 4: ميزان ضغط الامتحانات والأولويات (Exam Priorities & Weights) -->
        <section id="crunch-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow">[دراسة بذكاء]</span>
              <h2 class="section-title">ما تضيّع ليلتك ع درس ما عليه غير علامتين!</h2>
              <p class="section-subtext">
                مش شطارة تسهر ليلة كاملة ع أصعب شابتر بالكتاب، وتروح ع الامتحان تلاقي الدكتور جايب عليه سؤال بـ 3 علامات، والدرس اللي طنشته عليه نص الامتحان! مِحْوَر بورجيك ثقل كل درس بالامتحان وكم ساعة محتاج لتركيزه عشان تضمن معدلك.
              </p>
            </div>

            <div class="crunch-grid">
              
              <!-- الكارت الأول: مساق تحت الضغط المرتفع -->
              <div class="crunch-card">
                <div>
                  <div class="crunch-card-top">
                    <span class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 12px; color: var(--saas-amber); font-weight: 700;">
                      CS-311: OPERATING_SYSTEMS
                    </span>
                    <span class="crunch-status-badge crunch-high">
                      باقي 9 أيام [تركيز مكثف 2.5x]
                    </span>
                  </div>

                  <h4 style="margin: 0 0 8px; font-size: 16px; color: var(--saas-text);">
                    نظم التشغيل والعمليات المتزامنة (OS)
                  </h4>
                  <p style="font-size: 13px; color: var(--saas-text-secondary); line-height: 1.6; margin: 0;">
                    موعد الاختبار النهائي بعد 9 أيام فقط. مِحْوَر ضاعف الساعات المقترحة أسبوعياً تلقائياً من 4 ساعات إلى 10 ساعات وحجز حصص تركيز عالية عشان تراجع مادتك بدون سهر رعب.
                  </p>

                  <div class="crunch-scale-meter">
                    <div class="crunch-scale-fill fill-high" style="width: 82%;"></div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--saas-text-muted); border-top: 1px solid var(--saas-border-subtle); padding-top: 12px; margin-top: 16px;">
                  <span>الحصص المقترحة: <strong>5 جلسات / أسبوع</strong></span>
                  <span style="color: var(--saas-amber); font-weight: 700;">وزن الامتحان: 2.50x</span>
                </div>
              </div>

              <!-- الكارت الثاني: مساق في وضعه الطبيعي المستقر -->
              <div class="crunch-card">
                <div>
                  <div class="crunch-card-top">
                    <span class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 12px; color: var(--saas-cyan); font-weight: 700;">
                      SWE-201: SOFTWARE_ENGINEERING
                    </span>
                    <span class="crunch-status-badge crunch-normal">
                      باقي 34 يوماً [وتيرة مستقرة 1.0x]
                    </span>
                  </div>

                  <h4 style="margin: 0 0 8px; font-size: 16px; color: var(--saas-text);">
                    هندسة البرمجيات ودورة حياة النظم (SWE)
                  </h4>
                  <p style="font-size: 13px; color: var(--saas-text-secondary); line-height: 1.6; margin: 0;">
                    موعد الاختبار بعد شهر تقريباً. وتيرة دراسة تراكمية هادئة بمعدل جلستين أسبوعياً لمنع تراكم المحاضرات براحة بال ودون استنزاف طاقتك الذهنية.
                  </p>

                  <div class="crunch-scale-meter">
                    <div class="crunch-scale-fill fill-normal" style="width: 35%;"></div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--saas-text-muted); border-top: 1px solid var(--saas-border-subtle); padding-top: 12px; margin-top: 16px;">
                  <span>الحصص المقترحة: <strong>جلستان / أسبوع</strong></span>
                  <span style="color: var(--saas-cyan); font-weight: 700;">وزن الامتحان: 1.00x</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- القسم 5: المقارنة الصريحة (The Real Comparison) -->
        <section id="audit-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow">[مقارنة حقيقية]</span>
              <h2 class="section-title">الفرق بين التشتت الجامعي المعتاد.. وراحة البال مع مِحْوَر</h2>
              <p class="section-subtext">
                شوف الفرق بين الفوضى اللي بتعيشها كل فصل، وبين النظام اللي بريّح راسك وبرفع معدلك.
              </p>
            </div>

            <div class="audit-ledger-box">
              
              <!-- المقارنة 1: التفرغ والتعارض -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag">[ بدون مِحْوَر ]</span>
                <div class="audit-text">
                  تحديد أوقات دراسة عشوائية بتتعارض مع محاضراتك، والنتيجة: تسويف دائم وتأجيل لآخر الأسبوع وإحباط.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag">[ مع مِحْوَر ]</span>
                <div class="audit-text">
                  قفل مواعيد محاضراتك الجامعية وتوزيع دراستك فقط في أوقات فراغك الحقيقية بروقان وبدون أي تعارض.
                </div>
              </div>

              <!-- المقارنة 2: نقطة التوقف -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag">[ بدون مِحْوَر ]</span>
                <div class="audit-text">
                  تبدأ قعدتك ع المكتب بسؤال بضيّع نص ساعة: "وين كنت واصل وشو أدرس هلقيت؟" وتتشتت بالتلفون.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag">[ مع مِحْوَر ]</span>
                <div class="audit-text">
                  كبسة زر وحدة بترجعك فوراً للدرس والدقيقة اللي وقفت عندها بآخر جلسة، وبتدخل بصلب الموضوع علطول.
                </div>
              </div>

              <!-- المقارنة 3: ضغط الامتحانات -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag">[ بدون مِحْوَر ]</span>
                <div class="audit-text">
                  تسهر ليلة كاملة ع أصعب شابتر ما عليه غير علامتين، وتتفاجأ بنص الامتحان ع الدرس اللي طنشته.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag">[ مع مِحْوَر ]</span>
                <div class="audit-text">
                  توزيع وقتك حسب ثقل علامات الامتحان وموعده، عشان تضمن أعلى معدل بأقل مجهود وتوتر.
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- القسم 6: الأسئلة الشائعة والنداء الأخير (Technical FAQ & Master CTA) -->
        <section id="faq-section" class="section-wrapper landing-reveal" style="border-bottom: none;">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow">[الأسئلة الشائعة]</span>
              <h2 class="section-title">كل اللي ببالك عن مِحْوَر وكيف بفيدك</h2>
              <p class="section-subtext">
                إجابات سريعة وواضحة على أهم استفسارات الطلبة عن النظام والتجربة الأولى.
              </p>
            </div>

            <!-- الأكورديون التفاعلي -->
            <div class="faq-accordion">
              
              <div class="faq-card is-open">
                <button type="button" class="faq-trigger" aria-expanded="true">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag">[سؤال 01]</span>
                    <strong>كيف مِحْوَر بضمن إنه مواعيد دراستي ما تتعارض مع محاضراتي الجامعية؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  مِحْوَر بياخد جدولك الجامعي وبقفله تماماً، وبوزع ساعات دراستك فقط في أوقات الفراغ الحقيقية بين المحاضرات مع فترات راحة كافية عشان تدرس بنشاط وما ترهق حالك.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag">[سؤال 02]</span>
                    <strong>لو سكرت اللابتوب أو المتصفح فجأة.. هل بضيع وين كنت واصل؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  أبداً! مِحْوَر بحفظ مكان وقوفك وإنجازك بالدرس لحظة بلحظة سحابياً، وأول ما تفتح بترجع بنفس المكان والدقيقة بنقرة وحدة بدون أي ضياع لوقتك.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag">[سؤال 03]</span>
                    <strong>كيف النظام بعرف إني مضغوط قبل الامتحان وبساعدني؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  بمجرد ما تسجل موعد الاختبار، مِحْوَر ببلش يحسب الأيام المتبقية تلقائياً. وكل ما يقرب الامتحان، برفع أولوية المادة وساعاتها تدريجياً عشان تخلص وتراجع قبل ليلة الامتحان بدون سهر رعب.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag">[سؤال 04]</span>
                    <strong>هل بحتاج أنزل برامج أو إضافات معقدة ع اللابتوب؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  لا نهائياً، مِحْوَر بشتغل مباشرة وسريعاً من أي متصفح عندك على اللابتوب أو الآيباد، بدون تحميل برامج ثقيلة أو استهلاك لموارد جهازك.
                </div>
              </div>

            </div>

            <!-- الكارت الختامي الماستر (Final Master CTA Card) -->
            <div class="final-cta-card">
              <div style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald); margin-bottom: 12px;">
                [ انضم للدفعة الأولى ]
              </div>
              <h3 style="font-size: clamp(24px, 3.5vw, 36px); font-weight: 800; color: var(--saas-text); margin: 0 0 12px;">
                فصلك بلّش.. ادرسه بروقان مش برعب
              </h3>
              <p style="font-size: 15px; color: var(--saas-text-secondary); max-width: 580px; margin: 0 auto; line-height: 1.7;">
                جرّب مِحْوَر هلقيت، رتّب موادك من أول أسبوع، وشوف الفرق الحقيقي براحة بالك ومعدلك.
              </p>

              <div class="final-cta-actions">
                <button type="button" class="landing-waitlist-pill-btn" data-action="open-waitlist">
                  <span class="pill-sparkle">${icons.sparkles(16)}</span>
                  <span>احجز مقعدك وابدأ مجاناً</span>
                  <span class="pill-arrow" aria-hidden="true">&larr;</span>
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      <!-- التذييل الفني المصغر (Precision Footer) -->
      <footer class="landing-footer">
        <div class="landing-container landing-footer-inner">
          <div class="landing-footer-telemetry">
            [SYS: OK] &bull; الدفعة الأولى متاحة الآن &bull; تفعيل المقاعد فوري
          </div>

          <div class="landing-footer-links">
            <button type="button" class="landing-footer-waitlist-link" data-action="open-waitlist">احجز مقعدك</button>
            <span style="color: var(--saas-border-strong);">&bull;</span>
            <a href="#faq-section" class="landing-footer-link" data-scroll-to="faq-section">الأسئلة الشائعة</a>
            <span style="color: var(--saas-border-strong);">&bull;</span>
            <span class="landing-footer-link" style="cursor: default;">مِحْوَر &copy; 2026</span>
          </div>
        </div>
      </footer>

    </div>
  `;

  // ---------------------------------------------------------
  // 1. منطق العداد الحي المتصاعد (Ascending Chronometer Logic)
  // ---------------------------------------------------------
  let totalSeconds = 42 * 60 + 18; // يبدأ من 00:42:18
  const timerEl = container.querySelector('#landing-mockup-timer');

  const timerInterval = setInterval(() => {
    if (!timerEl || !document.body.contains(timerEl)) {
      clearInterval(timerInterval);
      return;
    }

    totalSeconds++;
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    timerEl.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // ---------------------------------------------------------
  // 2. منطق الدرج المتنقل لشاشات الموبايل (Mobile Drawer Logic)
  // ---------------------------------------------------------
  const navbarEl = container.querySelector('.landing-navbar');
  const menuToggleBtn = container.querySelector('#landing-menu-toggle');
  const mobileDrawer = container.querySelector('#landing-mobile-drawer');
  const hamburgerIcon = menuToggleBtn?.querySelector('.hamburger-icon');
  const closeIcon = menuToggleBtn?.querySelector('.close-icon');

  function openDrawer() {
    if (!mobileDrawer || !menuToggleBtn) return;
    mobileDrawer.classList.add('is-open');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    menuToggleBtn.setAttribute('aria-expanded', 'true');
    if (hamburgerIcon) hamburgerIcon.style.display = 'none';
    if (closeIcon) closeIcon.style.display = 'inline-block';
  }

  function closeDrawer() {
    if (!mobileDrawer || !menuToggleBtn) return;
    mobileDrawer.classList.remove('is-open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    menuToggleBtn.setAttribute('aria-expanded', 'false');
    if (hamburgerIcon) hamburgerIcon.style.display = 'inline-block';
    if (closeIcon) closeIcon.style.display = 'none';
  }

  function toggleDrawer() {
    if (!mobileDrawer) return;
    if (mobileDrawer.classList.contains('is-open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDrawer();
    });
  }

  // ---------------------------------------------------------
  // 3. التمرير الانسيابي واعتراض الهاش راوتر (Smooth Scroll Router Guard)
  // ---------------------------------------------------------
  const scrollLinks = container.querySelectorAll('[data-scroll-to]');
  const handleScrollClick = (e) => {
    e.preventDefault();
    closeDrawer();
    const link = e.currentTarget;
    const targetId = link.getAttribute('data-scroll-to');
    if (targetId) {
      const targetEl = container.querySelector(`#${targetId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
  scrollLinks.forEach((link) => {
    link.addEventListener('click', handleScrollClick);
  });

  // إغلاق الدرج عند النقر بالخارج أو الضغط على مفتاح Escape أو تكبير الشاشة
  const onDocClick = (e) => {
    if (!mobileDrawer || !mobileDrawer.classList.contains('is-open')) return;
    if (navbarEl && !navbarEl.contains(e.target)) {
      closeDrawer();
    }
  };
  document.addEventListener('click', onDocClick);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  const onWindowResize = () => {
    if (window.innerWidth > 860 && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
  };
  window.addEventListener('resize', onWindowResize, { passive: true });

  // ---------------------------------------------------------
  // 4. منطق الأكورديون التفاعلي للأسئلة الشائعة (دوران 180 درجة)
  // ---------------------------------------------------------
  const faqCards = container.querySelectorAll('.faq-card');
  faqCards.forEach((card) => {
    const trigger = card.querySelector('.faq-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isOpen = card.classList.contains('is-open');
        faqCards.forEach((c) => {
          c.classList.remove('is-open');
          const t = c.querySelector('.faq-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          card.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // ---------------------------------------------------------
  // 5. ربط أزرار حجز المقعد وتفعيل الحساب (Modals Trigger)
  // ---------------------------------------------------------
  let activeWaitlistCleanup = null;
  let activeActivationCleanup = null;

  const waitlistBtns = container.querySelectorAll('[data-action="open-waitlist"]');
  waitlistBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      closeDrawer();
      if (activeActivationCleanup) {
        activeActivationCleanup();
        activeActivationCleanup = null;
      }
      if (activeWaitlistCleanup) activeWaitlistCleanup();
      activeWaitlistCleanup = openWaitlistModal();
    });
  });

  const activationBtns = container.querySelectorAll('[data-action="open-activation"]');
  activationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      closeDrawer();
      if (activeWaitlistCleanup) {
        activeWaitlistCleanup();
        activeWaitlistCleanup = null;
      }
      if (activeActivationCleanup) activeActivationCleanup();
      activeActivationCleanup = openActivationModal();
    });
  });


  // ---------------------------------------------------------
  // 6. مراقب ظهور الأقسام بالسكرول (Scroll Reveal Motion)
  // ---------------------------------------------------------
  const revealElements = container.querySelectorAll('.landing-reveal');
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );
  revealElements.forEach((el) => revealObserver.observe(el));

  // ---------------------------------------------------------
  // 7. متابعة حركة الماوس لتأثير الإضاءة التفاعلية (Interactive Spotlight)
  // ---------------------------------------------------------
  const landingContainer = container.querySelector('.landing-page');
  let rafId = null;
  const onPointerMove = (e) => {
    if (!landingContainer) return;
    const rect = landingContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      landingContainer.style.setProperty('--mouse-x', `${x}px`);
      landingContainer.style.setProperty('--mouse-y', `${y}px`);
    });
  };

  if (landingContainer) {
    landingContainer.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  // ---------------------------------------------------------
  // 8. دالة التنظيف الصارمة لمنع تسريب الذاكرة (Memory Cleanup Contract)
  // ---------------------------------------------------------
  return function cleanupLandingPage() {
    if (activeWaitlistCleanup) activeWaitlistCleanup();
    if (activeActivationCleanup) activeActivationCleanup();
    clearInterval(timerInterval);
    revealObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    if (landingContainer) {
      landingContainer.removeEventListener('pointermove', onPointerMove);
    }

    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onWindowResize);
    scrollLinks.forEach((link) => {
      link.removeEventListener('click', handleScrollClick);
    });

    if (prevTheme) {
      document.documentElement.setAttribute('data-theme', prevTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
}
