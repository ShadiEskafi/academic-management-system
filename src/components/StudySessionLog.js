// src/components/StudySessionLog.js
import {
  fetchCourseSessionsHistory,
  updateStudySession,
  deleteStudySession,
} from '../api/studySessions.js';
import { icons } from '../utils/icons.js';
import { skeletons } from '../utils/skeletons.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/sanitize.js';

const OUTCOME_CONFIG = {
  completed: { label: 'مكتمل بالكامل', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  partially_completed: { label: 'إنجاز جزئي / للمتابعة', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  studied_something_else: { label: 'دراسة شيء آخر', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
};

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) {
    return 'أقل من دقيقة';
  }
  if (seconds < 60) {
    return `${seconds} ثانية (أقل من دقيقة)`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const paddedSecs = String(secs).padStart(2, '0');

  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = String(mins % 60).padStart(2, '0');
    return `${hrs}:${remMins}:${paddedSecs} ساعة`;
  }
  return `${mins}:${paddedSecs} دقيقة`;
}

function formatSessionDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('ar-EG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function renderStudySessionLog(
  container,
  { courseId, topics = [], onSessionsChange = () => {} }
) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2);">
        <div>
          <h3 style="margin:0 0 4px;">سجل جلسات المذاكرة</h3>
          <p class="text-secondary" style="font-size:13px;margin:0;">أرشيف الجلسات المنجزة، الملاحظات المدونة، والوقت الفعلي المستثمر.</p>
        </div>
        <span id="sessions-total-count" class="badge" style="background:var(--color-bg-subtle);font-size:12px;"></span>
      </div>

      <div id="sessions-log-container"></div>
    </div>
  `;

  const logListEl = container.querySelector('#sessions-log-container');
  const countBadgeEl = container.querySelector('#sessions-total-count');

  let sessionsList = [];

  async function reloadLog() {
    logListEl.innerHTML = skeletons.tableRows(3);

    const { sessions, error } = await fetchCourseSessionsHistory(courseId);

    if (error) {
      logListEl.innerHTML = `
        <div class="card error-state">
          <div class="error-state-icon">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل سجل الجلسات</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
      return;
    }

    sessionsList = sessions || [];
    countBadgeEl.textContent = `${sessionsList.length} جلسات مسجلة`;

    if (!sessionsList.length) {
      logListEl.innerHTML = `
        <div class="card empty-state" style="padding:var(--space-6);text-align:center;">
          <div class="empty-state-icon">${icons.play(32)}</div>
          <h4>لا توجد جلسات مذاكرة مكتملة بعد</h4>
          <p class="text-secondary" style="font-size:13px;">ابدأ أول جلسة دراسة من الزر العلوي لتسجيل وقتك وإنجازك هنا.</p>
        </div>
      `;
      return;
    }

    logListEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${sessionsList
          .map((s) => {
            const outInfo = OUTCOME_CONFIG[s.outcome] || OUTCOME_CONFIG.completed;
            const executionDate = s.scheduledEnd || s.scheduledStart;

            return `
              <div class="card" style="padding:var(--space-3) var(--space-4);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-2);">
                  <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
                    <strong style="font-size:14px;color:var(--color-text);">${escapeHtml(s.topicTitle)}</strong>
                    <span class="badge" style="background:${outInfo.bg};color:${outInfo.color};font-size:11px;">
                      ${outInfo.label}
                    </span>
                  </div>

                  <div style="display:flex;align-items:center;gap:var(--space-2);">
                    <span class="badge" style="background:rgba(255,255,255,0.06);font-family:monospace;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                      ${icons.clock(12)} ${formatDuration(s.durationSeconds)}
                    </span>
                    <button type="button" class="btn-icon edit-log-btn" data-id="${s.id}" title="تعديل الجلسة">
                      ${icons.edit(14)}
                    </button>
                    <button type="button" class="btn-icon delete-log-btn" data-id="${s.id}" title="حذف الجلسة" style="color:var(--color-danger);">
                      ${icons.trash(14)}
                    </button>
                  </div>
                </div>

                <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:6px;display:inline-flex;align-items:center;gap:4px;">
                  ${icons.calendar(12)} <span>${formatSessionDate(executionDate)}</span>
                </div>

                ${
                  s.notes
                    ? `<div style="background:var(--color-bg-subtle);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);font-size:13px;color:var(--color-text);margin-top:var(--space-2);border-right:3px solid var(--color-primary);">${escapeHtml(s.notes)}</div>`
                    : `<span style="font-size:12px;color:var(--color-text-tertiary);font-style:italic;">لا توجد ملاحظات مدونة لهذه الجلسة.</span>`
                }
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    logListEl.querySelectorAll('.delete-log-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('هل أنت متأكد من حذف هذه الجلسة؟ سيتم خصم وقتها من إجمالي ساعات المذاكرة.')) {
          const { error } = await deleteStudySession(id);
          if (error) {
            showToast('تعذر حذف الجلسة', 'error');
          } else {
            showToast('تم حذف الجلسة وتحديث الإحصائيات', 'success');
            await reloadLog();
            onSessionsChange();
          }
        }
      });
    });

    logListEl.querySelectorAll('.edit-log-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = sessionsList.find((s) => s.id === btn.dataset.id);
        if (item) openEditModal(item);
      });
    });
  }

  function openEditModal(sessionItem) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const currentMinutes = Math.floor(sessionItem.durationSeconds / 60);
    const currentSeconds = sessionItem.durationSeconds % 60;

    const topicOptions = topics.length
      ? topics
          .map(
            (t) =>
              `<option value="${t.id}" ${t.title === sessionItem.topicTitle ? 'selected' : ''}>${escapeHtml(t.title)}</option>`
          )
          .join('')
      : `<option value="">${escapeHtml(sessionItem.topicTitle)}</option>`;

    overlay.innerHTML = `
      <div class="modal-content">
        <h3>تعديل تفاصيل جلسة المذاكرة</h3>
        <p class="modal-description">تعديل الموضوع، وقت المذاكرة الفعلي، والتقييم والملاحظات.</p>

        <form id="edit-session-form">
          <div class="field">
            <label class="field-label">الموضوع المدروس</label>
            <select class="input" name="topicId" id="edit-topic-select">
              ${topicOptions}
            </select>
          </div>

          <div class="field">
            <label class="field-label">نتيجة وتقييم الجلسة</label>
            <select class="input" name="outcome">
              <option value="completed" ${sessionItem.outcome === 'completed' ? 'selected' : ''}>مكتمل بالكامل</option>
              <option value="partially_completed" ${sessionItem.outcome === 'partially_completed' ? 'selected' : ''}>إنجاز جزئي / للمتابعة</option>
              <option value="studied_something_else" ${sessionItem.outcome === 'studied_something_else' ? 'selected' : ''}>تمت دراسة شيء آخر</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="field">
              <label class="field-label">المدة (دقائق)</label>
              <input class="input" type="number" name="durationMinutes" min="0" value="${currentMinutes}" required />
            </div>
            <div class="field">
              <label class="field-label">المدة (ثواني)</label>
              <input class="input" type="number" name="durationSeconds" min="0" max="59" value="${currentSeconds}" required />
            </div>
          </div>

          <div class="field">
            <label class="field-label">الملاحظات والملخص</label>
            <textarea class="input" name="notes" rows="3" placeholder="اكتب ملخص ما درسته أو نقاط للمراجعة...">${escapeHtml(sessionItem.notes)}</textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancel-edit-session-btn">إلغاء</button>
            <button type="submit" class="btn-primary">
              ${icons.check(15)}
              <span>حفظ التعديلات الكاملة</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    const form = overlay.querySelector('#edit-session-form');
    const cancelBtn = overlay.querySelector('#cancel-edit-session-btn');
    const topicSelect = overlay.querySelector('#edit-topic-select');

    function cleanup() {
      if (overlay.parentElement) document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', cleanup);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const outcome = fd.get('outcome');
      const mins = Number(fd.get('durationMinutes')) || 0;
      const secs = Number(fd.get('durationSeconds')) || 0;
      const totalSecs = mins * 60 + secs;
      const notes = fd.get('notes');

      const selectedOption = topicSelect.options[topicSelect.selectedIndex];
      const selectedTopicTitle = selectedOption ? selectedOption.text : sessionItem.topicTitle;
      const selectedTopicId = topicSelect.value || sessionItem.topicId;

      const { error } = await updateStudySession(sessionItem.id, {
        topicId: selectedTopicId,
        topicTitle: selectedTopicTitle,
        outcome,
        durationSeconds: totalSecs,
        notes: notes.trim(),
      });

      if (error) {
        showToast('تعذر حفظ التعديلات', 'error');
      } else {
        showToast('تم تحديث بيانات الجلسة بنجاح', 'success');
        cleanup();
        await reloadLog();
        onSessionsChange();
      }
    });
  }

  reloadLog();

  return () => {
    container.innerHTML = '';
  };
}
