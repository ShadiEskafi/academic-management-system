// src/components/ActiveSessionModal.js
import { icons } from '../utils/icons.js';

/**
 * 1. مودال إعداد وبدء الجلسة
 */
export function renderSessionSetupModal({
  topics = [],
  currentTopicId = null,
  onStart,
  onClose = () => {},
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'session-setup-title');

  const rootTopics = topics.filter((t) => !t.parent_id);

  function getSubtopics(parentId) {
    return topics.filter((t) => t.parent_id === parentId);
  }

  let initialRootId = null;
  let initialSubtopicId = null;

  if (currentTopicId) {
    const target = topics.find((t) => t.id === currentTopicId);
    if (target) {
      if (!target.parent_id) {
        initialRootId = target.id;
      } else {
        initialSubtopicId = target.id;
        let curr = target;
        while (curr && curr.parent_id) {
          const parent = topics.find((t) => t.id === curr.parent_id);
          if (!parent) break;
          curr = parent;
        }
        initialRootId = curr ? curr.id : target.parent_id;
      }
    }
  }

  if (!initialRootId && rootTopics.length > 0) {
    initialRootId = rootTopics[0].id;
  }

  const rootOptionsHtml = rootTopics
    .map(
      (t) =>
        `<option value="${t.id}" ${t.id === initialRootId ? 'selected' : ''}>${escapeHtml(t.title)}</option>`
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="session-setup-title">بدء جلسة دراسة مركزة</h3>
      <p class="modal-description">حدد الموضوع الأكاديمي والمدة الزمنية المخصصة للتركيز.</p>

      <form id="session-setup-form">
        <div class="field">
          <label class="field-label" for="session-root-topic-select">الموضوع الأساسي *</label>
          <select class="input" name="rootTopicId" id="session-root-topic-select" required>
            ${rootOptionsHtml || '<option value="" disabled selected>لا توجد مواضيع متاحة</option>'}
          </select>
        </div>

        <div id="subtopic-container"></div>

        <div class="field">
          <label class="field-label" for="session-duration-select">المدة الزمنية المستهدفة</label>
          <select class="input" name="durationMinutes" id="session-duration-select">
            <option value="25">25 دقيقة (Pomodoro Focus)</option>
            <option value="45" selected>45 دقيقة (جلسة دراسة قياسية)</option>
            <option value="60">60 دقيقة (ساعة كاملة)</option>
            <option value="90">90 دقيقة (تركيز معمّق)</option>
            <option value="0">جلسة مفتوحة (بدون حد زمني)</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-setup-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="start-session-submit-btn">
            ${icons.play(15)}
            <span>ابدأ المذاكرة الآن</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#session-setup-form');
  const cancelBtn = overlay.querySelector('#cancel-setup-btn');
  const rootSelect = overlay.querySelector('#session-root-topic-select');
  const subtopicContainer = overlay.querySelector('#subtopic-container');

  function updateSubtopicDropdown(selectedRootId, preselectedSubId = null) {
    const subtopics = getSubtopics(selectedRootId);
    if (subtopics.length === 0) {
      subtopicContainer.innerHTML = '';
      return;
    }

    const subOptionsHtml = subtopics
      .map(
        (st) =>
          `<option value="${st.id}" ${st.id === preselectedSubId ? 'selected' : ''}>↳ ${escapeHtml(st.title)}</option>`
      )
      .join('');

    subtopicContainer.innerHTML = `
      <div class="field">
        <label class="field-label" for="session-subtopic-select">الموضوع الفرعي (اختياري)</label>
        <select class="input" name="subTopicId" id="session-subtopic-select">
          <option value="">-- دراسة الموضوع الأساسي ككل --</option>
          ${subOptionsHtml}
        </select>
      </div>
    `;
  }

  if (initialRootId) updateSubtopicDropdown(initialRootId, initialSubtopicId);

  rootSelect.addEventListener('change', (e) => {
    updateSubtopicDropdown(e.target.value, null);
  });

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentElement) document.body.removeChild(overlay);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedRootId = rootSelect.value;
    const subSelect = overlay.querySelector('#session-subtopic-select');
    const selectedSubId = subSelect ? subSelect.value : null;
    const durationMinutes = Number(form.querySelector('#session-duration-select').value) || 0;

    const finalTopicId = selectedSubId || selectedRootId;
    const finalTopic = topics.find((t) => t.id === finalTopicId);

    cleanup();
    onStart(finalTopicId, finalTopic?.title || 'موضوع عام', durationMinutes);
  });
}

/**
 * 2. شريط المؤقت الحي العائم
 */
export function renderActiveSessionBar({
  topicTitle,
  startTime = Date.now(),
  endTime = null,
  onFinish,
  onCancel,
}) {
  const bar = document.createElement('div');
  bar.className = 'active-session-bar';
  bar.id = 'floating-session-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'جلسة مذاكرة نشطة');

  const hasTarget = !!endTime;

  function formatTime(seconds) {
    const s = Math.max(0, seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0;">
      <span class="active-session-pulse" aria-hidden="true"></span>
      <div style="display:flex;flex-direction:column;min-width:0;">
        <span class="text-tertiary" style="font-size:11px;font-weight:600;text-transform:uppercase;">
          ${hasTarget ? 'مؤقت تنازلي للهدف' : 'جلسة مذاكرة نشطة'}
        </span>
        <span style="font-weight:600;font-size:14px;color:var(--color-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;">
          ${escapeHtml(topicTitle)}
        </span>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:var(--space-2);flex-shrink:0;">
      <span id="session-timer-display" class="session-timer-clock">00:00</span>
      <button type="button" id="finish-session-btn" class="btn-primary" style="font-size:13px;min-height:36px;padding:0 var(--space-3);">
        ${icons.check(14)}
        <span>إنهاء</span>
      </button>
      <button type="button" id="abort-session-btn" class="btn-secondary" style="font-size:12px;min-height:36px;padding:0 var(--space-2);" title="إلغاء الجلسة دون حفظ">
        إلغاء
      </button>
    </div>
  `;

  document.body.appendChild(bar);

  const timerDisplay = bar.querySelector('#session-timer-display');
  const finishBtn = bar.querySelector('#finish-session-btn');
  const abortBtn = bar.querySelector('#abort-session-btn');

  let intervalId = null;

  function updateClock() {
    const now = Date.now();

    if (hasTarget) {
      const remainingSeconds = Math.floor((endTime - now) / 1000);

      if (remainingSeconds <= 0) {
        timerDisplay.textContent = '00:00';
        removeBar();
        const totalElapsed = Math.floor((endTime - startTime) / 1000);
        onFinish({
          elapsedSeconds: totalElapsed,
          formattedTime: formatTime(totalElapsed),
          isTimeUp: true,
        });
        return;
      }

      timerDisplay.textContent = formatTime(remainingSeconds);
    } else {
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      timerDisplay.textContent = formatTime(elapsedSeconds);
    }
  }

  updateClock();
  intervalId = setInterval(updateClock, 1000);

  function removeBar() {
    if (intervalId) clearInterval(intervalId);
    if (bar.parentElement) document.body.removeChild(bar);
  }

  finishBtn.addEventListener('click', () => {
    removeBar();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onFinish({ elapsedSeconds: elapsed, formattedTime: formatTime(elapsed), isTimeUp: false });
  });

  abortBtn.addEventListener('click', () => {
    removeBar();
    onCancel();
  });

  return removeBar;
}

/**
 * 3. مودال التحديث السريع لتوثيق الإنجاز
 */
export function renderQuickUpdateModal({
  topicTitle,
  formattedDuration,
  isTimeUp = false,
  onSave,
  onClose = () => {},
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'quick-update-title');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="quick-update-title">
        ${isTimeUp ? '⏰ انتهى وقت الجلسة المحدد!' : 'تسجيل إنجاز الجلسة'}
      </h3>
      <p class="modal-description" style="margin-bottom:var(--space-3);">
        الموضوع: <strong>${escapeHtml(topicTitle)}</strong> — مدة المذاكرة: <span class="font-en" style="font-weight:600;color:var(--color-accent);">${formattedDuration}</span>
      </p>

      <form id="quick-update-form">
        <div class="field">
          <label class="field-label">ما هي حالة الموضوع الأكاديمي الآن؟</label>
          <div class="quick-status-group">
            <label class="status-option">
              <input type="radio" name="topicStatus" value="completed" checked />
              <div>
                <strong>مكتمل (Completed)</strong>
                <p>أنجزت المطلوب بالكامل ويمكن الانتقال لما بعده.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="in_progress" />
              <div>
                <strong>قيد المتابعة (In Progress)</strong>
                <p>أحرزت تقدماً جيداً ولكنه يتطلب جلسة عمل أخرى.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="needs_review" />
              <div>
                <strong>يحتاج مراجعة (Needs Review)</strong>
                <p>تمت دراسته لكنه بحاجة إلى حل تمارين ومراجعة سريعة.</p>
              </div>
            </label>
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="session-notes">ملاحظات الجلسة (اختياري)</label>
          <textarea
            id="session-notes"
            name="notes"
            class="input"
            placeholder="أين توقفت؟ ما هي النقاط الغامضة؟"
            rows="3"
          ></textarea>
        </div>

        <p id="quick-update-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-update-btn">إلغاء</button>
          <button type="submit" class="btn-primary" id="save-update-btn">
            ${icons.check(15)}
            <span>حفظ وتحديث الإنجاز</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('#quick-update-form');
  const cancelBtn = overlay.querySelector('#cancel-update-btn');
  const saveBtn = overlay.querySelector('#save-update-btn');
  const errorEl = overlay.querySelector('#quick-update-error');

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentElement) document.body.removeChild(overlay);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.classList.add('btn-loading');

    const formData = new FormData(form);
    const topicStatus = formData.get('topicStatus');
    const notes = formData.get('notes')?.trim() || null;

    const result = await onSave({ topicStatus, notes });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ الجلسة.';
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
  });
}

/**
 * 4. مودال استعادة الجلسات العالقة غير المكتملة
 */
export function renderStaleSessionModal({
  session,
  onResolve,
  onDiscard,
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'stale-session-title');

  const startDate = new Date(session.scheduled_start);
  const timeFormatted = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  overlay.innerHTML = `
    <div class="modal-content">
      <div style="display:flex;align-items:center;gap:var(--space-2);color:var(--color-warning);margin-bottom:var(--space-2);">
        ${icons.alertTriangle(24)}
        <h3 id="stale-session-title" style="margin:0;">جلسة مذاكرة سابقة غير مكتملة</h3>
      </div>
      <p class="modal-description">
        عثر النظام على جلسة سابقة بدأت في <strong>${timeFormatted}</strong> للموضوع: <strong>${escapeHtml(session.topic_title)}</strong> ولم يتم إغلاقها.
      </p>

      <div style="background:var(--color-bg-subtle);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-4);font-size:13px;line-height:1.6;">
        اختر كيف تود تسوية هذه الجلسة لمتابعة استخدام النظام:
      </div>

      <div class="modal-actions" style="flex-direction:column;gap:var(--space-2);">
        <button type="button" class="btn-primary" id="resolve-stale-btn" style="width:100%;justify-content:center;">
          ${icons.check(15)}
          <span>توثيق الإنجاز وحفظ الملاحظات</span>
        </button>
        <button type="button" class="btn-secondary" id="discard-stale-btn" style="width:100%;justify-content:center;color:var(--color-danger);">
          ${icons.trash(15)}
          <span>إلغاء الجلسة وتجاهلها</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const resolveBtn = overlay.querySelector('#resolve-stale-btn');
  const discardBtn = overlay.querySelector('#discard-stale-btn');

  function cleanup() {
    if (overlay.parentElement) document.body.removeChild(overlay);
  }

  resolveBtn.addEventListener('click', () => {
    cleanup();
    onResolve();
  });

  discardBtn.addEventListener('click', async () => {
    discardBtn.disabled = true;
    discardBtn.classList.add('btn-loading');
    cleanup();
    await onDiscard();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}