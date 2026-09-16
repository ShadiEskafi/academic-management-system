// src/pages/LandingPage.js
// صفحة الهبوط الرسمية لنظام "مِحْوَر | Mihwar"
// هندسة بصرية فائقة الدقة بنمط SaaS العالمي (Linear × Mintlify × Hellotime)
// وضع داكن حصري، ودجات تفاعلية حقيقية (Micro-UI Widgets)، أرقام جدولية، وعزل اتجاهي BiDi صارم

import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';
import { openWaitlistModal } from '../components/WaitlistModal.js';

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

          <!-- روابط أقسام الصفحة الانسيابية -->
          <nav class="landing-nav-links" aria-label="أقسام الصفحة">
            <a href="#capacity-section" class="landing-nav-link">المصفوفة الأسبوعية</a>
            <a href="#checkpoint-section" class="landing-nav-link">شجرة الاستئناف</a>
            <a href="#crunch-section" class="landing-nav-link">ميزان الامتحانات</a>
            <a href="#audit-section" class="landing-nav-link">المقارنة الهندسية</a>
            <a href="#faq-section" class="landing-nav-link">الأسئلة الشائعة</a>
          </nav>

          <!-- إجراء الحجز المباشر (Single Conversion CTA) -->
          <div class="landing-nav-actions">
            <button type="button" class="landing-nav-pill-btn" data-action="open-waitlist">
              <span class="pill-sparkle">${icons.sparkles(14)}</span>
              <span>احجز مقعدك</span>
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
            
            <!-- شارة الحالة الصارمة -->
            <div class="hero-badge bidi-plaintext" dir="ltr">
              <span class="pilot-lamp" aria-hidden="true"></span>
              <span>SYSTEM: DETERMINISTIC ENGINE &bull; ZERO-DRIFT</span>
            </div>

            <!-- العنوان الرئيسي الأنيق المتدرج -->
            <h1 class="hero-title">
              إلغاء التشتت الأكاديمي.<br>
              <span class="hero-title-gradient">ضبط الإيقاع الزمني بحسابات قطعية.</span>
            </h1>

            <!-- الوصف الفني الواضح -->
            <p class="hero-desc">
              محرك إدارة جامعية يحوّل ساعات تفرغك إلى إحداثيات مدروسة، يحفظ نقطة توقفك في كل مساق حتى الثانية، ويضاعف وتيرة الدراسة تلقائياً قبل الامتحانات بنسبة صفر تعارض زمني.
            </p>

            <!-- زر الدعوة الرئيسي الأوحد لقائمة الانتظار -->
            <div class="hero-ctas">
              <button type="button" class="landing-waitlist-pill-btn" data-action="open-waitlist">
                <span class="pill-sparkle">${icons.sparkles(16)}</span>
                <span>احجز مقعدك في التجربة الأولى</span>
                <span class="pill-arrow" aria-hidden="true">&larr;</span>
              </button>
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
                  <div class="hud-title-text bidi-plaintext" dir="ltr">
                    RUNTIME: ACTIVE_SESSION [ID: S-9842 &bull; AVL_ROTATION]
                  </div>
                </div>

                <div class="hud-body">
                  <div class="hud-session-panel">
                    <div class="hud-session-top">
                      <span class="hud-course-tag bidi-plaintext" dir="ltr">CS-301: DATA_STRUCTURES</span>
                      <span class="hud-crunch-badge">
                        ${icons.zap(13)}
                        <span>مقياس الضغط: 2.1x (امتحان وشيك بعد 9 أيام)</span>
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
                        <div class="hud-progress-label bidi-plaintext" dir="ltr">
                          PROGRESS: 68% &bull; REMAINING: 18m
                        </div>
                      </div>

                      <!-- العداد الحي المتصاعد -->
                      <div class="hud-chrono-box">
                        <div id="landing-mockup-timer" class="mockup-timer-clock bidi-plaintext" dir="ltr">00:42:18</div>
                        <div class="hud-chrono-status">
                          <span class="pilot-lamp" aria-hidden="true"></span>
                          <span>مؤقت حي متصاعد</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="hud-footer-strip">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${icons.calendar(14)}
                      <span>الجلسة القادمة: أنظمة التشغيل (OS) - اليوم 06:30 م</span>
                    </div>
                    <div class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald);">
                      CHECKPOINT INTEGRITY: 100% PERSISTED
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- القسم 1: شريط الإثبات المصغر فائق النحافة (Minimal Proof Strip 44px) -->
        <section class="minimal-proof-strip landing-reveal" aria-label="مؤشرات أداء مِحْوَر">
          <div class="landing-container">
            <div class="proof-strip-inner bidi-plaintext" dir="ltr">
              <div class="proof-item">
                <span class="pilot-lamp"></span>
                <span>SIGNAL: LOCKED</span>
                <span style="color: var(--saas-text-muted);">(صفر تعارض زمني)</span>
              </div>
              <span class="proof-sep">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-cyan);">&bull;</span>
                <span>ENGINE: ROUND-ROBIN BALANCED</span>
                <span style="color: var(--saas-text-muted);">(توزيع متكافئ للمواد)</span>
              </div>
              <span class="proof-sep">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-emerald);">&bull;</span>
                <span>STATE: 1-MIN CHECKPOINT SYNC</span>
                <span style="color: var(--saas-text-muted);">(حفظ نقطة التوقف)</span>
              </div>
              <span class="proof-sep">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-amber);">&bull;</span>
                <span>AUTO-CRUNCH: T-MINUS MULTIPLIER</span>
                <span style="color: var(--saas-text-muted);">(مضاعفة الساعات للامتحانات)</span>
              </div>
              <span class="proof-sep">/</span>
              <div class="proof-item">
                <span style="color: var(--saas-emerald);">&bull;</span>
                <span>DRIFT: 0.00%</span>
                <span style="color: var(--saas-text-muted);">(تزامن تام)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- القسم 2: مصفوفة توزيع التفرغ (Hellotime-Style Capacity Matrix Widget) -->
        <section id="capacity-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow bidi-plaintext" dir="ltr">[CAPACITY ALLOCATION MATRIX]</span>
              <h2 class="section-title">تخطيط أسبوعي ذري يلغي الصدفة والعشوائية</h2>
              <p class="section-subtext">
                توزيع ساعات المذاكرة تلقائياً في فترات فراغك الحقيقية بين المحاضرات مع قفل تلقائي للحصص الجامعية وحجز فترات راحة حتمية لمنع الإرهاق.
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
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; opacity: 0.7;">[SLOT: LOCKED]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>استراحة إلزامية (30 دقيقة)</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">10:30 - 12:30</strong>
                    <span>مِحْوَر: هياكل بيانات</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[AUTO-SCHEDULED]</span>
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
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[CRUNCH 2.5x]</span>
                  </div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">11:30 - 01:30</strong>
                    <span>مختبر برمجيات</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; opacity: 0.7;">[SLOT: LOCKED]</span>
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
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; opacity: 0.7;">[SLOT: LOCKED]</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">10:30 - 12:00</strong>
                    <span>مِحْوَر: هندسة برمجيات</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[ROUND-ROBIN]</span>
                  </div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">02:00 - 03:30</strong>
                    <span>مِحْوَر: احتمالات وإحصاء</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[AUTO-SCHEDULED]</span>
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
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[CRUNCH WEIGHT]</span>
                  </div>
                  <div class="capacity-block capacity-block-locked">
                    <strong class="bidi-plaintext" dir="ltr">01:00 - 03:00</strong>
                    <span>مشروع تخرج / تدريب</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; opacity: 0.7;">[SLOT: LOCKED]</span>
                  </div>
                </div>

                <!-- الخميس -->
                <div class="capacity-day-col">
                  <div class="capacity-day-header">الخميس (THU)</div>
                  <div class="capacity-block capacity-block-mihwar">
                    <strong class="bidi-plaintext" dir="ltr">09:00 - 11:30</strong>
                    <span>مِحْوَر: مراجعة أسبوعية</span>
                    <span class="bidi-plaintext" dir="ltr" style="font-size: 9px; font-weight: 700;">[CONSOLIDATION]</span>
                  </div>
                  <div class="capacity-block capacity-block-buffer">
                    <span>نهاية الأسبوع الأكاديمي</span>
                  </div>
                </div>

              </div>

              <div class="capacity-footer-bar">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="pilot-lamp"></span>
                  <span>ساعات التفرغ المخصصة للدراسة: <strong>16.5 ساعة أسبوعياً</strong> موزعة رياضياً.</span>
                </div>
                <div class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald);">
                  COLLISION PROBABILITY: 0.000% [MATHEMATICALLY IMPOSSIBLE]
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- القسم 3: شجرة نقطة التوقف النشطة (Linear/Mintlify Checkpoint Tree Widget) -->
        <section id="checkpoint-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow bidi-plaintext" dir="ltr">[STATE PERSISTENCE TREE]</span>
              <h2 class="section-title">استئناف فوري من حيث توقفت بدون ضياع ثانية</h2>
              <p class="section-subtext">
                تدرج شجري هيكلي لكل وحدة ومحاضرة في كل مساق، مع رصد ذكي لنقطة التوقف وحفظها فورياً حتى عند إغلاق التبويب فجأة.
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
                <div class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 12px; color: var(--saas-emerald); background: var(--saas-emerald-soft); padding: 4px 10px; border-radius: var(--saas-radius-sm); border: 1px solid var(--saas-border-emerald);">
                  TOTAL PROGRESS: 74%
                </div>
              </div>

              <div class="tree-branch-group">
                
                <!-- الوحدة الأولى (مكتملة) -->
                <div class="tree-unit-row is-completed">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.check(15)}</span>
                    <span>الوحدة 1: تحليل تعقيد الخوارزميات والتدوين الرياضي (Asymptotic Notation)</span>
                  </div>
                  <span class="bidi-plaintext" dir="ltr" style="font-size: 11px; font-family: var(--saas-font-mono);">
                    [4/4 LECTURES DONE]
                  </span>
                </div>

                <!-- الوحدة الثانية (مكتملة) -->
                <div class="tree-unit-row is-completed">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.check(15)}</span>
                    <span>الوحدة 2: هياكل البيانات المترابطة والقوائم والمكدسات (Stacks &amp; Queues)</span>
                  </div>
                  <span class="bidi-plaintext" dir="ltr" style="font-size: 11px; font-family: var(--saas-font-mono);">
                    [6/6 LECTURES DONE]
                  </span>
                </div>

                <!-- الوحدة الثالثة (قيد التنفيذ وبها نقطة التوقف النشطة) -->
                <div class="tree-unit-row" style="border-color: var(--saas-border-emerald); color: var(--saas-text);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--saas-emerald);">${icons.folderTree(15)}</span>
                    <strong>الوحدة 3: الأشجار المتوازنة وأشجار البحث الثنائية (Balanced Trees)</strong>
                  </div>
                  <span class="bidi-plaintext" dir="ltr" style="font-size: 11px; font-family: var(--saas-font-mono); color: var(--saas-emerald);">
                    [CURRENT BRANCH &bull; 3/5]
                  </span>
                </div>

                <!-- تفريعات المحاضرات للوحدة الثالثة -->
                <div class="tree-sub-items">
                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-emerald);">${icons.check(14)}</span>
                      <span>محاضرة 1: خصائص Binary Search Trees والمطابقة الخطية</span>
                    </div>
                    <span class="bidi-plaintext" dir="ltr">COMPLETED</span>
                  </div>

                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-emerald);">${icons.check(14)}</span>
                      <span>محاضرة 2: شجرة AVL وحساب معامل التوازن (Balance Factor)</span>
                    </div>
                    <span class="bidi-plaintext" dir="ltr">COMPLETED</span>
                  </div>

                  <!-- العقدة النشطة (Active Checkpoint) -->
                  <div class="tree-lecture-node is-active-checkpoint">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="pilot-lamp"></span>
                      <div>
                        <strong style="color: #ffffff;">محاضرة 3: الدوران الأحادي والمزدوج (Left/Right Rotations)</strong>
                        <div style="font-size: 11px; color: var(--saas-emerald); margin-top: 2px;">
                          آخر نقطة توقف محفوظة: الدقيقة 18:40 من أصل 35:00
                        </div>
                      </div>
                    </div>
                    <span class="tree-resume-pill bidi-plaintext" dir="ltr">
                      SAVED CHECKPOINT &bull; 18:40
                    </span>
                  </div>

                  <div class="tree-lecture-node">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--saas-text-dim);">&bull;</span>
                      <span>محاضرة 4: أشجار Red-Black Trees ومقارنة التعقيد الزمني</span>
                    </div>
                    <span class="bidi-plaintext" dir="ltr" style="opacity: 0.5;">UPCOMING</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        <!-- القسم 4: ميزان ضغط الامتحانات (Auto-Crunch Weight Widget) -->
        <section id="crunch-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow bidi-plaintext" dir="ltr">[DYNAMIC CRUNCH ENGINE]</span>
              <h2 class="section-title">إعادة موازنة الساعات تلقائياً حسب قرب موعد الامتحان</h2>
              <p class="section-subtext">
                ترفع خوارزمية مِحْوَر تلقائياً وزن وأولوية المساق الأقرب للاختبارات النهائية، لتركز جهدك حيث تكون الحاجة ملحة دون الحاجة لإعادة التخطيط يدوياً.
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
                    <span class="crunch-status-badge crunch-high bidi-plaintext" dir="ltr">
                      T-9 DAYS [CRUNCH: 2.5x]
                    </span>
                  </div>

                  <h4 style="margin: 0 0 8px; font-size: 16px; color: var(--saas-text);">
                    نظم التشغيل والعمليات المتزامنة (OS)
                  </h4>
                  <p style="font-size: 13px; color: var(--saas-text-secondary); line-height: 1.6; margin: 0;">
                    موعد الاختبار النهائي بعد 9 أيام فقط. قامت الخوارزمية بمضاعفة الساعات المقترحة أسبوعياً من 4 ساعات إلى 10 ساعات وحجز حصص ذات تركيز مرتفع.
                  </p>

                  <div class="crunch-scale-meter">
                    <div class="crunch-scale-fill fill-high" style="width: 82%;"></div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--saas-text-muted); border-top: 1px solid var(--saas-border-subtle); padding-top: 12px; margin-top: 16px;">
                  <span>الحصص الأسبوعية: <strong>5 جلسات / أسبوع</strong></span>
                  <span class="bidi-plaintext" dir="ltr" style="color: var(--saas-amber); font-weight: 700;">WEIGHT: 2.50x</span>
                </div>
              </div>

              <!-- الكارت الثاني: مساق في وضعه الطبيعي المستقر -->
              <div class="crunch-card">
                <div>
                  <div class="crunch-card-top">
                    <span class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 12px; color: var(--saas-cyan); font-weight: 700;">
                      SWE-201: SOFTWARE_ENGINEERING
                    </span>
                    <span class="crunch-status-badge crunch-normal bidi-plaintext" dir="ltr">
                      T-34 DAYS [BASELINE: 1.0x]
                    </span>
                  </div>

                  <h4 style="margin: 0 0 8px; font-size: 16px; color: var(--saas-text);">
                    هندسة البرمجيات ودورة حياة النظم (SWE)
                  </h4>
                  <p style="font-size: 13px; color: var(--saas-text-secondary); line-height: 1.6; margin: 0;">
                    موعد الاختبار بعد 34 يوماً. يعمل المساق بوتيرة تراكمية هادئة بمعدل جلستين أسبوعياً لمنع تراكم المحاضرات دون استنزاف طاقتك الذهنية.
                  </p>

                  <div class="crunch-scale-meter">
                    <div class="crunch-scale-fill fill-normal" style="width: 35%;"></div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--saas-text-muted); border-top: 1px solid var(--saas-border-subtle); padding-top: 12px; margin-top: 16px;">
                  <span>الحصص الأسبوعية: <strong>جلستان / أسبوع</strong></span>
                  <span class="bidi-plaintext" dir="ltr" style="color: var(--saas-cyan); font-weight: 700;">WEIGHT: 1.00x</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- القسم 5: سجل التدقيق والمقارنة (The Precision Audit Ledger) -->
        <section id="audit-section" class="section-wrapper landing-reveal">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow bidi-plaintext" dir="ltr">[ARCHITECTURAL AUDIT LEDGER]</span>
              <h2 class="section-title">الفارق الجذري بين الفوضى ودقة محرك مِحْوَر</h2>
              <p class="section-subtext">
                مقارنة مباشرة تثبت كيف تحل المعمارية الحسابية مشاكل التشتت الأكاديمي التي تعجز عنها الجداول الورقية والتطبيقات العامة.
              </p>
            </div>

            <div class="audit-ledger-box">
              
              <!-- المقارنة 1: التفرغ والتعارض -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag bidi-plaintext" dir="ltr">[CHAOS_MODE]</span>
                <div class="audit-text">
                  تحديد أوقات دراسة عشوائية تتصادم مع المحاضرات الجامعية الفعلية، مما يسبب تأجيلاً متكرراً وفقدان الانضباط بنهاية الأسبوع.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag bidi-plaintext" dir="ltr">[MIHWAR_CALIBRATED]</span>
                <div class="audit-text">
                  قفل صارم لساعات محاضراتك مع حجز أوقات الدراسة في فترات التفرغ الحقيقية فقط، بنسبة تصادم تبلغ 0.00% رياضياً.
                </div>
              </div>

              <!-- المقارنة 2: نقطة التوقف -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag bidi-plaintext" dir="ltr">[CHAOS_MODE]</span>
                <div class="audit-text">
                  البدء في كل جلسة بسؤال مهدِر للطاقة: "أين توقفت في المرة السابقة؟ وماذا يجب أن أدرس الآن؟" وضياع 20 دقيقة في التردد.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag bidi-plaintext" dir="ltr">[MIHWAR_CALIBRATED]</span>
                <div class="audit-text">
                  استئناف فوري بنقرة زر واحدة (Resume Button) من الدقيقة والثانية المحددة التي توقفت عندها بالضبط عبر Checkpoint Engine.
                </div>
              </div>

              <!-- المقارنة 3: ضغط الامتحانات -->
              <div class="audit-row audit-row-chaos">
                <span class="audit-tag bidi-plaintext" dir="ltr">[CHAOS_MODE]</span>
                <div class="audit-text">
                  توزيع الساعات بالتساوي على جميع المواد حتى ليلة الامتحان، مما يفاجئ الطالب بكثافة المادة التي اقترب اختبارها.
                </div>
              </div>
              <div class="audit-row audit-row-calibrated">
                <span class="audit-tag bidi-plaintext" dir="ltr">[MIHWAR_CALIBRATED]</span>
                <div class="audit-text">
                  خوارزمية Auto-Crunch ترصد العد التنازلي للاختبارات وتعيد توجيه ساعات الأسبوع تلقائياً للمساق الأكثر إلحاحاً.
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- القسم 6: الأسئلة الشائعة الهندسية والنداء الأخير (Technical FAQ & Master CTA) -->
        <section id="faq-section" class="section-wrapper landing-reveal" style="border-bottom: none;">
          <div class="landing-container">
            <div class="section-header">
              <span class="section-eyebrow bidi-plaintext" dir="ltr">[TECHNICAL SPECIFICATIONS &amp; FAQ]</span>
              <h2 class="section-title">تساؤلات معمارية وإجابات قطعية</h2>
              <p class="section-subtext">
                كل ما تحتاج معرفته عن فلسفة النظام، حماية البيانات، وآلية التشغيل الفورية.
              </p>
            </div>

            <!-- الأكورديون التفاعلي -->
            <div class="faq-accordion">
              
              <div class="faq-card is-open">
                <button type="button" class="faq-trigger" aria-expanded="true">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag bidi-plaintext" dir="ltr">[FAQ-01: ENGINE]</span>
                    <strong>كيف تضمن الخوارزمية انعدام أي تعارض زمني بنسبة 0.00%؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  يقوم المحرك بفرز فترات التفرغ المحددة وتطبيق خوارزمية الفحص الصارم (Non-Overlapping Interval Scheduler). يتم استبعاد أي دقيقة محجوزة لمحاضرة جامعية أو التزام مسبق قبل تخصيص أي جلسة مذاكرة، مع حجز هوامش راحة (Buffer Time) إجبارية.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag bidi-plaintext" dir="ltr">[FAQ-02: STORAGE]</span>
                    <strong>هل تضيع نقاط التوقف (Checkpoints) عند إغلاق المتصفح فجأة؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  كلا، النظام مزود بمحرك مزامنة لحظي (Realtime Persistence) يحفظ موضعك الدقيق عند كل انتقال ومحاضرة، بالإضافة إلى مؤقت محلي يرسل حالة التقدم تلقائياً لقاعدة البيانات المشفرة السحابية.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag bidi-plaintext" dir="ltr">[FAQ-03: ALGORITHM]</span>
                    <strong>كيف يتم تفعيل مضاعف الامتحان (Auto-Crunch Weight)؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  بمجرد إدخال تاريخ الاختبار النهائي لأي مساق، يبدأ العداد التنازلي (T-Minus Days). عندما يقترب الموعد لما دون 14 يوماً، يتصاعد وزن المساق رياضياً من 1.0x تدريجياً حتى 2.5x، ليعيد توزيع حصص الأسبوع تلقائياً لصالحه.
                </div>
              </div>

              <div class="faq-card">
                <button type="button" class="faq-trigger" aria-expanded="false">
                  <div class="faq-code-wrap">
                    <span class="faq-code-tag bidi-plaintext" dir="ltr">[FAQ-04: PREREQUISITES]</span>
                    <strong>هل أحتاج لتثبيت أي برامج أو إضافات على جهازي؟</strong>
                  </div>
                  <span class="faq-chevron bidi-plaintext" dir="ltr">&#9662;</span>
                </button>
                <div class="faq-content-pane">
                  يعمل "مِحْوَر" بالكامل داخل المتصفح (Web-Native Application) بتقنيات متقدمة خفيفة تضمن العمل بسرعة 60 إطاراً في الثانية دون استهلاك موارد المعالج أو الحاجة لتثبيت برمجيات خارجية.
                </div>
              </div>

            </div>

            <!-- الكارت الختامي الماستر (Final Master CTA Card) -->
            <div class="final-cta-card">
              <div class="bidi-plaintext" dir="ltr" style="font-family: var(--saas-font-mono); font-size: 11px; color: var(--saas-emerald); margin-bottom: 12px;">
                [ZERO-DRIFT WORKSPACE]
              </div>
              <h3 style="font-size: clamp(24px, 3.5vw, 36px); font-weight: 800; color: var(--saas-text); margin: 0 0 12px;">
                حوّل دراستك الجامعية إلى مسار انضباطي فائق الدقة.
              </h3>
              <p style="font-size: 15px; color: var(--saas-text-secondary); max-width: 580px; margin: 0 auto; line-height: 1.7;">
                انضم الآن لمجتمع الدفعة الأولى واحجز مقعدك بتذكرة رقمية رسمية فورية.
              </p>

              <div class="final-cta-actions">
                <button type="button" class="landing-waitlist-pill-btn" data-action="open-waitlist">
                  <span class="pill-sparkle">${icons.sparkles(16)}</span>
                  <span>احجز مقعدك في التجربة الأولى</span>
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
          <div class="landing-footer-telemetry bidi-plaintext" dir="ltr">
            [SYS: OK] &bull; ME-CENTRAL &bull; LATENCY: 12ms &bull; DRIFT: 0.00%
          </div>

          <div class="landing-footer-links">
            <button type="button" class="landing-footer-waitlist-link" data-action="open-waitlist">احجز مقعدك</button>
            <span style="color: var(--saas-border-strong);">&bull;</span>
            <a href="#faq-section" class="landing-footer-link">الأسئلة الشائعة</a>
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
  // 2. منطق الأكورديون التفاعلي للأسئلة الشائعة (دوران 180 درجة)
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
  // 3. ربط أزرار حجز المقعد وقائمة الانتظار (Waitlist Modal Trigger)
  // ---------------------------------------------------------
  let activeWaitlistCleanup = null;
  const waitlistBtns = container.querySelectorAll('[data-action="open-waitlist"]');
  waitlistBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (activeWaitlistCleanup) activeWaitlistCleanup();
      activeWaitlistCleanup = openWaitlistModal();
    });
  });

  // ---------------------------------------------------------
  // 4. مراقب ظهور الأقسام بالسكرول (Scroll Reveal Motion)
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
  // 5. متابعة حركة الماوس لتأثير الإضاءة التفاعلية (Interactive Spotlight)
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
  // 6. دالة التنظيف الصارمة لمنع تسريب الذاكرة (Memory Cleanup Contract)
  // ---------------------------------------------------------
  return function cleanupLandingPage() {
    if (activeWaitlistCleanup) activeWaitlistCleanup();
    clearInterval(timerInterval);
    revealObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    if (landingContainer) {
      landingContainer.removeEventListener('pointermove', onPointerMove);
    }

    if (prevTheme) {
      document.documentElement.setAttribute('data-theme', prevTheme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
}
