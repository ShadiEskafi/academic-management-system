// src/components/planner/ManualSessionModal.js
// نافذة منبثقة لإضافة جلسة مذاكرة يدوياً إلى الجدول الأسبوعي

import { icons } from '../../utils/icons.js';
import { escapeHtml } from '../../utils/sanitize.js';
import { createManualPlannerSession } from '../../api/planner.js';
import { showToast } from '../../utils/toast.js';

export function renderManualSessionModal({ courses = [], defaultDate = new Date(), onSave }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
  `;

  let courseOptions = '<option value="">اختر المساق الدراسي...</option>';
  courses.forEach((c) => {
    courseOptions += `<option value="${c.id}">${escapeHtml(c.title)}</option>`;
  });

  const formattedDateIso = defaultDate.toISOString().split('T')[0];

  overlay.innerHTML = `
    <div class="modal-card card" style="
      position: relative;
      width: 100%;
      max-width: 500px;
      padding: var(--space-6);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    ">
      <button type="button" id="close-modal-btn" aria-label="إغلاق" style="
        position: absolute;
        top: 16px;
        left: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
      " onmouseover="this.style.color='var(--color-text)';this.style.background='var(--color-bg-subtle)';" onmouseout="this.style.color='var(--color-text-secondary)';this.style.background='var(--color-bg-secondary)';">
        ✕
      </button>

      <div style="margin-bottom: var(--space-5); padding-left: 36px;">
        <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin: 0; display: flex; align-items: center; gap: 8px;">
          ${icons.plus(20)}
          <span>إضافة جلسة مذاكرة يدوية</span>
        </h3>
        <p style="font-size: 13px; color: var(--color-text-secondary); margin: 4px 0 0 0;">حدد المساق والتوقيت لإدراج جلسة مذاكرة مخصصة في جدولك</p>
      </div>

      <form id="manual-session-form" style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div>
          <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">المساق الدراسي *</label>
          <select id="modal-course-select" class="form-control" required style="font-size: 13px; min-height: 42px;">
            ${courseOptions}
          </select>
        </div>

        <div>
          <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">الموضوع المستهدف</label>
          <select id="modal-topic-select" class="form-control" style="font-size: 13px; min-height: 42px;">
            <option value="">مذاكرة عامة للمساق</option>
          </select>
        </div>

        <div>
          <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">تاريخ الجلسة *</label>
          <input type="date" id="modal-date-input" class="form-control" value="${formattedDateIso}" required style="font-size: 13px; min-height: 42px;" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">وقت البداية *</label>
            <input type="time" id="modal-start-time" class="form-control" value="09:00" required style="font-size: 13px; min-height: 42px;" />
          </div>
          <div>
            <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">وقت النهاية *</label>
            <input type="time" id="modal-end-time" class="form-control" value="09:50" required style="font-size: 13px; min-height: 42px;" />
          </div>
        </div>

        <div>
          <label class="form-label" style="font-size: 13px; font-weight: 600; margin-bottom: 6px; display: block; color: var(--color-text);">ملاحظات الجلسة (اختياري)</label>
          <input type="text" id="modal-notes-input" class="form-control" placeholder="مثال: التركيز على حل أسئلة الفصل الأول" style="font-size: 13px; min-height: 42px;" />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-3);">
          <button type="button" class="btn-secondary" id="cancel-modal-btn" style="min-height: 40px; padding-inline: 18px;">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-modal-btn" style="min-height: 40px; padding-inline: 20px;">حفظ الجلسة</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const courseSelect = overlay.querySelector('#modal-course-select');
  const topicSelect = overlay.querySelector('#modal-topic-select');

  courseSelect.addEventListener('change', () => {
    const courseId = courseSelect.value;
    topicSelect.innerHTML = '<option value="">مذاكرة عامة للمساق</option>';
    if (!courseId) return;

    const course = courses.find((c) => c.id === courseId);
    if (course && course.topics) {
      course.topics.forEach((t) => {
        topicSelect.innerHTML += `<option value="${t.id}">${escapeHtml(t.title)}</option>`;
      });
    }
  });

  const closeModal = () => overlay.remove();
  overlay.querySelector('#close-modal-btn').addEventListener('click', closeModal);
  overlay.querySelector('#cancel-modal-btn').addEventListener('click', closeModal);

  overlay.querySelector('#manual-session-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = courseSelect.value;
    const topicId = topicSelect.value || null;
    const dateVal = overlay.querySelector('#modal-date-input').value;
    const startTimeVal = overlay.querySelector('#modal-start-time').value;
    const endTimeVal = overlay.querySelector('#modal-end-time').value;
    const notesVal = overlay.querySelector('#modal-notes-input').value;

    if (!courseId) {
      showToast('يرجى اختيار المساق الدراسي', 'warning');
      return;
    }

    const scheduledStart = new Date(`${dateVal}T${startTimeVal}:00`).toISOString();
    const scheduledEnd = new Date(`${dateVal}T${endTimeVal}:00`).toISOString();

    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      showToast('وقت نهاية الجلسة يجب أن يكون بعد وقت البداية', 'warning');
      return;
    }

    const submitBtn = overlay.querySelector('#save-modal-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري الحفظ...';

    const { session, error } = await createManualPlannerSession({
      courseId,
      topicId,
      scheduledStart,
      scheduledEnd,
      notes: notesVal,
    });

    submitBtn.disabled = false;

    if (error) {
      showToast(error.message || 'حدث خطأ أثناء حفظ الجلسة', 'error');
    } else {
      showToast('تمت إضافة الجلسة بنجاح!', 'success');
      closeModal();
      if (onSave) onSave(session);
    }
  });
}
