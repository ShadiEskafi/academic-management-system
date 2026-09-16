// src/components/WaitlistModal.js
// نافذة تسجيل واسترجاع تذاكر قائمة الانتظار (Mihwar Waitlist & Retina Canvas Ticket Modal)

import { joinOrGetWaitlist } from '../api/waitlist.js';
import { icons } from '../utils/icons.js';
import { escapeHtml } from '../utils/sanitize.js';

const TICKET_STUB_URL = 'STUDENT-CENTRIC OS';

// مسارات فيكتور شعار مِحْوَر الرسمي (Official Vector Logo Paths)
const logoWingTop = new Path2D(
  'M329.556 3.23995C382.302 12.484 426.347 37.4974 459.517 77.0567C480.452 102.07 495.406 133.473 502.339 167.051C505.873 183.636 505.873 224.826 502.475 239.78C496.222 267.648 487.521 288.175 472.568 310.47C462.78 325.016 438.31 348.942 421.453 360.089C413.84 365.119 407.315 369.061 407.043 368.653C406.771 368.381 408.131 366.342 410.17 364.167C415.2 358.594 423.492 348.126 430.154 339.154C460.605 297.555 474.335 253.102 470.121 210.144C463.867 145.708 427.842 92.6901 371.019 64.414C349.404 53.5387 328.604 47.965 300.328 45.3821C247.855 40.4882 187.904 61.4233 143.995 100.167C110.009 130.074 80.7814 177.926 70.7216 220.34C69.0903 227.001 68.1387 228.089 56.0398 238.013C29.2592 259.763 15.2571 271.59 7.64433 279.067C-1.46382 287.903 -1.46381 288.175 2.61446 265.337C8.32404 232.983 12.2664 218.573 22.3261 192.88C39.9986 148.155 65.148 110.227 97.7742 78.824C135.838 42.3914 178.932 18.7374 230.318 5.9588C258.322 -0.838327 299.105 -1.92587 329.556 3.23995Z'
);
const logoWingBottom = new Path2D(
  'M197.556 114.985C188.176 125.045 185.593 128.171 176.757 139.863C156.501 166.915 144.81 192.2 138.557 223.467C133.663 246.985 135.43 282.738 142.499 306.256C156.909 354.244 193.614 396.794 238.475 417.865C267.294 431.323 294.075 436.489 327.925 435.13C358.648 433.77 384.885 427.245 412.481 413.787C432.736 403.999 450.273 391.492 468.625 373.82C491.192 352.069 503.155 335.756 518.788 305.305C524.226 294.837 534.014 268.192 536.053 257.997C536.868 254.462 541.762 249.704 561.066 233.527C574.253 222.38 589.614 209.057 594.916 203.891C600.353 198.726 605.111 194.783 605.383 195.055C605.791 195.327 605.519 198.318 604.84 201.716C604.16 205.115 601.985 216.398 600.082 226.866C590.022 280.427 567.727 330.726 536.868 369.741C495.678 421.671 438.582 459.327 379.175 473.465C357.968 478.495 351.443 479.311 325.886 479.991C305.766 480.534 296.93 480.262 284.423 478.359C222.162 469.251 170.096 437.577 135.43 387.686C126.458 374.771 115.583 352.884 110.145 336.979C95.0553 291.846 96.6866 243.859 114.767 201.58C124.283 179.558 137.469 160.798 156.501 142.445C170.096 129.395 195.245 111.179 200.275 110.771C201.09 110.635 199.731 112.674 197.556 114.985Z'
);
const logoCenterDot = new Path2D(
  'M303.455 295.38C334.162 295.38 359.055 270.487 359.055 239.78C359.055 209.072 334.162 184.179 303.455 184.179C272.747 184.179 247.854 209.072 247.854 239.78C247.854 270.487 272.747 295.38 303.455 295.38Z'
);

/**
 * فتح نافذة قائمة الانتظار
 * @param {Object} [options]
 * @param {string} [options.initialEmail]
 * @returns {Function} cleanup
 */
export function openWaitlistModal({ initialEmail = '' } = {}) {
  // إزالة أي مودال سابق مفتوح
  const existing = document.getElementById('waitlist-modal-root');
  if (existing) existing.remove();

  const modalRoot = document.createElement('div');
  modalRoot.id = 'waitlist-modal-root';
  modalRoot.className = 'waitlist-modal-overlay';
  document.body.appendChild(modalRoot);

  // حالة المكون المحلية (Local Component State)
  let state = 'input'; // 'input' | 'ticket'
  let isSubmitting = false;
  let errorMessage = '';
  let ticketData = null; // { seat_number, name, major, university, is_existing }

  // نموذج الحقول
  const formData = {
    name: '',
    major: '',
    university: '',
    email: initialEmail,
  };

  function closeModal() {
    window.removeEventListener('keydown', handleKeyDown);
    modalRoot.classList.add('is-closing');
    setTimeout(() => {
      modalRoot.remove();
    }, 200);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function render() {
    if (state === 'input') {
      modalRoot.innerHTML = `
        <div class="waitlist-modal-card" role="dialog" aria-modal="true" aria-labelledby="waitlist-modal-title">
          <button type="button" class="waitlist-close-btn" aria-label="إغلاق النافذة">
            ${icons.x(18)}
          </button>

          <div class="waitlist-header">
            <div class="waitlist-badge-pill bidi-plaintext" dir="ltr">
              <span class="waitlist-amber-dot"></span>
              <span>MIHWAR • EARLY ACCESS</span>
            </div>
            <h2 id="waitlist-modal-title" class="waitlist-title">احجز مقعدك في التجربة الأولى</h2>
            <p class="waitlist-subtitle">انضم للدفعة الرائدة من طلبة الجامعات واحصل على تذكرة حضور رقمية برقم مقعدك التسلسلي.</p>
          </div>

          ${
            errorMessage
              ? `
                <div class="waitlist-error-banner" role="alert">
                  ${icons.alertTriangle(16)}
                  <span>${escapeHtml(errorMessage)}</span>
                </div>
              `
              : ''
          }

          <form id="waitlist-form" class="waitlist-form" novalidate>
            <div class="waitlist-field-group">
              <label class="waitlist-label" for="waitlist-name">الاسم الكامل *</label>
              <input 
                type="text" 
                id="waitlist-name" 
                name="name" 
                class="waitlist-input" 
                placeholder="مثال: أحمد عبد الله" 
                value="${escapeHtml(formData.name)}" 
                required 
                autocomplete="name"
              />
            </div>

            <div class="waitlist-row-2col">
              <div class="waitlist-field-group">
                <label class="waitlist-label" for="waitlist-major">التخصص الجامعي *</label>
                <input 
                  type="text" 
                  id="waitlist-major" 
                  name="major" 
                  class="waitlist-input" 
                  placeholder="مثال: هندسة برمجيات" 
                  value="${escapeHtml(formData.major)}" 
                  required 
                />
              </div>

              <div class="waitlist-field-group">
                <label class="waitlist-label" for="waitlist-university">الجامعة *</label>
                <input 
                  type="text" 
                  id="waitlist-university" 
                  name="university" 
                  class="waitlist-input" 
                  placeholder="مثال: جامعة الملك سعود" 
                  value="${escapeHtml(formData.university)}" 
                  required 
                />
              </div>
            </div>

            <div class="waitlist-field-group">
              <label class="waitlist-label" for="waitlist-email">البريد الإلكتروني *</label>
              <input 
                type="email" 
                id="waitlist-email" 
                name="email" 
                class="waitlist-input bidi-plaintext" 
                dir="ltr" 
                placeholder="name@university.edu" 
                value="${escapeHtml(formData.email)}" 
                required 
                autocomplete="email"
              />
              <span class="waitlist-help-text">إذا كنت مسجلاً مسبقاً، سيتم استرجاع تذكرتك الأصلية تلقائياً دون أي تكرار.</span>
            </div>

            <div class="waitlist-actions">
              <button type="submit" class="waitlist-submit-btn" ${isSubmitting ? 'disabled' : ''}>
                ${isSubmitting ? icons.clock(18) : icons.sparkles(18)}
                <span>${isSubmitting ? 'جاري التحقق وتأكيد المقعد...' : 'تأكيد حجز المقعد واستخراج التذكرة'}</span>
              </button>
            </div>
          </form>
        </div>
      `;

      // أحداث الإدخال والإرسال
      const closeBtn = modalRoot.querySelector('.waitlist-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      modalRoot.addEventListener('click', (e) => {
        if (e.target === modalRoot) closeModal();
      });

      const form = modalRoot.querySelector('#waitlist-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const formElements = form.elements;
          formData.name = formElements.name.value.trim();
          formData.major = formElements.major.value.trim();
          formData.university = formElements.university.value.trim();
          formData.email = formElements.email.value.trim();

          if (!formData.name || !formData.major || !formData.university || !formData.email) {
            errorMessage = 'يرجى إكمال جميع الحقول المطلوبة.';
            render();
            return;
          }

          if (!formData.email.includes('@') || !formData.email.includes('.')) {
            errorMessage = 'يرجى إدخال عنوان بريد إلكتروني صحيح.';
            render();
            return;
          }

          isSubmitting = true;
          errorMessage = '';
          render();

          try {
            const res = await joinOrGetWaitlist(formData);
            ticketData = res;
            state = 'ticket';
            isSubmitting = false;
            render();
          } catch (err) {
            isSubmitting = false;
            errorMessage = err.message || 'حدث خطأ أثناء حجز المقعد. يرجى المحاولة لاحقاً.';
            render();
          }
        });
      }
    } else if (state === 'ticket' && ticketData) {
      const isExisting = Boolean(ticketData.is_existing);
      const seatPadded = String(ticketData.seat_number || 1).padStart(3, '0');

      modalRoot.innerHTML = `
        <div class="waitlist-modal-card waitlist-ticket-modal" role="dialog" aria-modal="true">
          <button type="button" class="waitlist-close-btn" aria-label="إغلاق النافذة">
            ${icons.x(18)}
          </button>

          <!-- شارة حالة التذكرة الذكية -->
          <div class="waitlist-ticket-banner ${isExisting ? 'is-returning' : 'is-success'}">
            ${isExisting ? icons.shieldCheck(18) : icons.sparkles(18)}
            <span>
              ${
                isExisting
                  ? 'مرحباً بعودتك! تم استرجاع تذكرتك السابقة بنجاح.'
                  : 'تم حجز مقعدك بنجاح! 🎉 أهلاً بك في مِحْوَر.'
              }
            </span>
          </div>

          <!-- حاوية التذكرة Canvas -->
          <div class="waitlist-canvas-container">
            <canvas id="ticket-canvas" class="waitlist-ticket-canvas"></canvas>
          </div>

          <!-- أزرار الإجراءات -->
          <div class="waitlist-ticket-actions">
            <button type="button" id="btn-download-ticket" class="waitlist-download-btn">
              ${icons.download(16)}
              <span>تحميل التذكرة (PNG)</span>
            </button>
            <button type="button" id="btn-close-ticket" class="waitlist-cancel-btn">
              <span>إغلاق</span>
            </button>
          </div>
        </div>
      `;

      const closeBtn = modalRoot.querySelector('.waitlist-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const closeActionBtn = modalRoot.querySelector('#btn-close-ticket');
      if (closeActionBtn) closeActionBtn.addEventListener('click', closeModal);

      modalRoot.addEventListener('click', (e) => {
        if (e.target === modalRoot) closeModal();
      });

      // رسم التذكرة في Canvas
      drawTicketCanvas(modalRoot.querySelector('#ticket-canvas'), {
        seatNumber: seatPadded,
        name: ticketData.name || formData.name,
        major: ticketData.major || formData.major,
        university: ticketData.university || formData.university,
      });

      // تنزيل التذكرة كصورة
      const downloadBtn = modalRoot.querySelector('#btn-download-ticket');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          const canvas = modalRoot.querySelector('#ticket-canvas');
          if (!canvas) return;
          const imageURL = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imageURL;
          link.download = `mihwar-pass-${seatPadded}.png`;
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
      }
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

/**
 * رسم تذكرة صعود مِحْوَر الرقمية الفاخرة بدقة عالية (Retina 2x) والشعار الرسمي
 * @param {HTMLCanvasElement} canvas
 * @param {Object} data
 */
async function drawTicketCanvas(canvas, { seatNumber, name, major, university }) {
  if (!canvas) return;

  // 1. انتظار تحميل الخطوط الرسمية لمنع الفلاش وسوء المحاذاة
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // الاستمرار في حال تعذر الانتظار
    }
  }

  // 2. إعداد أبعاد الـ Canvas مع دعم Retina 2x
  const width = 1000;
  const height = 520;
  const dpr = Math.max(window.devicePixelRatio || 1, 2);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // مسار البطاقة المستديرة مع القواطع الجانبية (Ticket Notches)
  const stubX = 720;
  const r = 24; // حواف البطاقة
  const notchR = 16; // نصف قطر القاطع التذكاري

  ctx.save();
  ctx.beginPath();
  // أعلى يسار
  ctx.moveTo(r, 0);
  // الخط العلوي مع قاطع علوي عند stubX
  ctx.lineTo(stubX - notchR, 0);
  ctx.arc(stubX, 0, notchR, Math.PI, 0, true);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  // الجانب الأيمن
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  // الخط السفلي مع قاطع سفلي عند stubX
  ctx.lineTo(stubX + notchR, height);
  ctx.arc(stubX, height, notchR, 0, Math.PI, true);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  // الجانب الأيسر
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();

  // 3. خلفية التذكرة الفاخرة (Dark Obsidian Gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#13141f');
  bgGrad.addColorStop(0.5, '#0d0e16');
  bgGrad.addColorStop(1, '#08080d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // هالة دائرية عنبرية خافتة في الزاوية العلوية
  const glow = ctx.createRadialGradient(220, 100, 10, 220, 100, 420);
  glow.addColorStop(0, 'rgba(245, 166, 34, 0.08)');
  glow.addColorStop(0.5, 'rgba(10, 132, 255, 0.04)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // شبكة نقاط ميكروسكوبية ناعمة جداً في الخلفية
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = 30; x < width - 30; x += 24) {
    for (let y = 30; y < height - 30; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. خط الفصل المنقط (Perforated Stub Divider)
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(stubX, notchR + 8);
  ctx.lineTo(stubX, height - notchR - 8);
  ctx.stroke();
  ctx.restore();

  // 5. قسم التذكرة الأيمن (Stub: 720 -> 1000)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.fillRect(stubX, 0, width - stubX, height);

  const stubCenter = stubX + (width - stubX) / 2; // 860

  // كود الدخول والباركود العلوي المقتضب (ارتفاع أقصى 40px)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 10px "JetBrains Mono", "IBM Plex Sans Arabic", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ENTRY PASS // كود الدخول', stubCenter, 52);

  const barTop = 68;
  const barHeight = 40;
  const barStartX = stubCenter - 85;
  const barWidth = 170;
  const barPattern = [
    3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 3, 2, 1, 4, 2,
  ];
  let curX = barStartX;
  const totalWeight = barPattern.reduce((a, b) => a + b, 0);
  const unit = barWidth / totalWeight;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  barPattern.forEach((w, idx) => {
    if (idx % 2 === 0) {
      ctx.fillRect(curX, barTop, w * unit, barHeight);
    }
    curX += w * unit;
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '600 9px "JetBrains Mono", monospace';
  ctx.fillText(`MHW-${seatNumber}-STUB`, stubCenter, 124);

  // فاصل أفقي خفيف في القسيمة
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(stubX + 35, 150);
  ctx.lineTo(width - 35, 150);
  ctx.stroke();

  // مركز القسيمة البصري: رقم المقعد الكبير وشارة الدفعة
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 10px "JetBrains Mono", "IBM Plex Sans Arabic", monospace';
  ctx.fillText('SEAT ALLOCATION // رقم المقعد', stubCenter, 210);

  ctx.fillStyle = '#F5A622';
  ctx.font = '900 64px "JetBrains Mono", monospace';
  ctx.fillText(`#${seatNumber}`, stubCenter, 280);

  // شارة BATCH-01 مباشرة تحت رقم المقعد
  ctx.fillStyle = 'rgba(245, 166, 34, 0.12)';
  ctx.beginPath();
  roundRect(ctx, stubCenter - 48, 302, 96, 24, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 166, 34, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#F5A622';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillText('BATCH-01', stubCenter, 318);

  // فاصل أفقي سفلي للقسيمة
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(stubX + 35, 360);
  ctx.lineTo(width - 35, 360);
  ctx.stroke();

  // قاعدة القسيمة: الرابط الرسمي وتأكيد الدخول
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '600 10px "JetBrains Mono", "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('ADMIT ONE • مصرح بالدخول', stubCenter, 415);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillText(TICKET_STUB_URL, stubCenter, 445);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '500 10px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('احفظ تذكرتك الرقمية', stubCenter, 468);
  ctx.restore();

  // 6. رأس التذكرة الرئيسي والشعار الرسمي (Header Area)
  ctx.save();
  ctx.translate(65, 52);
  ctx.scale(0.08, 0.08);
  ctx.fillStyle = '#F5A622';
  ctx.fill(logoWingTop);
  ctx.fill(logoWingBottom);
  ctx.fillStyle = '#FF6B5E';
  ctx.fill(logoCenterDot);
  ctx.restore();

  // اسم وهوية النظام بجانب الشعار
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('مِحْوَر | Mihwar', 125, 72);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '500 11px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('محرك الإدارة والجدولة الجامعية الفائقة', 125, 93);

  // شارة تذكرة الصعود في أعلى يمين القسم الرئيسي
  ctx.fillStyle = 'rgba(245, 166, 34, 0.08)';
  ctx.beginPath();
  roundRect(ctx, 470, 58, 190, 30, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 166, 34, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#F5A622';
  ctx.font = '700 11px "JetBrains Mono", "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOARDING PASS • تذكرة صعود', 565, 77);

  // خط فاصل أفقي تحت الرأس
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(65, 118);
  ctx.lineTo(660, 118);
  ctx.stroke();

  // 7. الصف الأول (Hero Row): اسم الطالب بعرض كامل وخوارزمية Clamping دقيقة
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 11px "JetBrains Mono", "IBM Plex Sans Arabic", monospace';
  ctx.fillText('PASSENGER // اسم الطالب', 660, 142);

  const maxNameWidth = 580;
  let nameFontSize = 38;
  ctx.font = `700 ${nameFontSize}px "IBM Plex Sans Arabic", sans-serif`;
  let measuredNameWidth = ctx.measureText(name).width;

  if (measuredNameWidth > maxNameWidth || name.length > 22) {
    nameFontSize = Math.max(20, Math.floor(nameFontSize * (maxNameWidth / Math.max(measuredNameWidth, 1))));
    ctx.font = `700 ${nameFontSize}px "IBM Plex Sans Arabic", sans-serif`;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, 660, 188);

  // 8. الصف الثاني (Details Grid): عمودان مفصولان بأمان صارم
  // العمود الأيمن: التخصص
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '600 11px "JetBrains Mono", "IBM Plex Sans Arabic", monospace';
  ctx.fillText('MAJOR // التخصص', 660, 238);

  ctx.font = '600 15px "IBM Plex Sans Arabic", sans-serif';
  let majorDisplay = major;
  const maxMajorWidth = 270;
  if (ctx.measureText(majorDisplay).width > maxMajorWidth) {
    while (majorDisplay.length > 3 && ctx.measureText(majorDisplay + '...').width > maxMajorWidth) {
      majorDisplay = majorDisplay.slice(0, -1);
    }
    majorDisplay += '...';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(majorDisplay, 660, 266);

  // العمود الأيسر: الصرح الجامعي (مع فاصل أمان 40px عن العمود الأيمن)
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '600 11px "JetBrains Mono", "IBM Plex Sans Arabic", monospace';
  ctx.fillText('UNIVERSITY // الصرح الجامعي', 340, 238);

  ctx.font = '600 15px "IBM Plex Sans Arabic", sans-serif';
  let univDisplay = university;
  const maxUnivWidth = 270;
  if (ctx.measureText(univDisplay).width > maxUnivWidth) {
    while (univDisplay.length > 3 && ctx.measureText(univDisplay + '...').width > maxUnivWidth) {
      univDisplay = univDisplay.slice(0, -1);
    }
    univDisplay += '...';
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(univDisplay, 340, 266);

  // 9. الصف الثالث: شارات الحالة الفاخرة
  // شارة الفئة الأولى (Amber)
  ctx.fillStyle = 'rgba(245, 166, 34, 0.1)';
  ctx.beginPath();
  roundRect(ctx, 480, 310, 180, 28, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 166, 34, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#F5A622';
  ctx.font = '700 11px "JetBrains Mono", "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EARLY ADMIT // الفئة الأولى', 570, 328);

  // شارة الاعتماد النشط (Emerald)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
  ctx.beginPath();
  roundRect(ctx, 310, 310, 155, 28, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#10B981';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('● VERIFIED ACTIVE', 387, 328);

  // 10. التذييل الفاخر المبسّط (إزالة التيليمتري واستبداله بسطر واحد نظيف)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(65, 380);
  ctx.lineTo(660, 380);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillText(`AUTH: SHA256-MHW-TICKET-${seatNumber} // NON-TRANSFERABLE`, 65, 445);

  ctx.textAlign = 'right';
  ctx.fillText('MIHWAR ACADEMIC OS • CLASS OF 2026', 660, 445);

  ctx.restore(); // إزالة الـ clip

  // 10. رسم الحدود الخارجية الزجاجية النهائية مع القواطع
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(stubX - notchR, 0);
  ctx.arc(stubX, 0, notchR, Math.PI, 0, true);
  ctx.lineTo(width - r, 0);
  ctx.quadraticCurveTo(width, 0, width, r);
  ctx.lineTo(width, height - r);
  ctx.quadraticCurveTo(width, height, width - r, height);
  ctx.lineTo(stubX + notchR, height);
  ctx.arc(stubX, height, notchR, 0, Math.PI, true);
  ctx.lineTo(r, height);
  ctx.quadraticCurveTo(0, height, 0, height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.stroke();
  ctx.restore();
}

/**
 * دالة مساعدة لرسم مستطيل مستدير الحواف
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

