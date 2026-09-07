// src/components/ActiveSessionModal.js
// إعداد الجلسة الدراسية، المؤقت الحي العائم، ومودال التحديث السريع وفق الـ Design System
import { icons } from '../utils/icons.js';

/**
 * 1. مودال اختيار الموضوع قبل بدء الجلسة — يدعم القوائم المتتالية (Cascading Dropdowns)
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
    .map((t) => {
      const isSelected = t.id === initialRootId;
      return `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(t.title)}</option>`;
    })
    .join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3 id="session-setup-title">بدء جلسة دراسة مركزة</h3>
      <p class="modal-description">حدد الموضوع الأكاديمي الذي تريد التركيز عليه في هذه الجلسة.</p>

      <form id="session-setup-form">
        <div class="field">
          <label class="field-label" for="session-root-topic-select">الموضوع الأساسي *</label>
          <select class="input" name="rootTopicId" id="session-root-topic-select" required>
            ${rootOptionsHtml || '<option value="" disabled selected>لا توجد مواضيع متاحة</option>'}
          </select>
        </div>

        <div id="subtopic-container"></div>

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
      .map((st) => {
        const isSelected = st.id === preselectedSubId;
        return `<option value="${st.id}" ${isSelected ? 'selected' : ''}>↳ ${escapeHtml(st.title)}</option>`;
      })
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

  if (initialRootId) {
    updateSubtopicDropdown(initialRootId, initialSubtopicId);
  }

  rootSelect.addEventListener('change', (e) => {
    updateSubtopicDropdown(e.target.value, null);
  });

  function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedRootId = rootSelect.value;
    const subSelect = overlay.querySelector('#session-subtopic-select');
    const selectedSubId = subSelect ? subSelect.value : null;

    const finalTopicId = selectedSubId || selectedRootId;
    const finalTopic = topics.find((t) => t.id === finalTopicId);

    cleanup();
    onStart(finalTopicId, finalTopic?.title || 'موضوع عام');
  });
}

/**
 * 2. شريط المؤقت الحي العائم أثناء المذاكرة مع دعم منع الاهتزاز والتجاوب
 */
export function renderActiveSessionBar({
  topicTitle,
  startTime = Date.now(),
  onFinish,
  onCancel,
}) {
  const bar = document.createElement('div');
  bar.className = 'active-session-bar';
  bar.id = 'floating-session-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'جلسة مذاكرة نشطة');

  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0;">
      <span class="active-session-pulse" aria-hidden="true"></span>
      <div style="display:flex;flex-direction:column;min-width:0;">
        <span class="text-tertiary" style="font-size:11px;font-weight:600;text-transform:uppercase;">جلسة مذاكرة نشطة</span>
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

  let elapsedSeconds = 0;
  const intervalId = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerDisplay.textContent = formatTime(elapsedSeconds);
  }, 1000);

  function removeBar() {
    clearInterval(intervalId);
    if (bar.parentElement) {
      document.body.removeChild(bar);
    }
  }

  finishBtn.addEventListener('click', () => {
    removeBar();
    onFinish({ elapsedSeconds, formattedTime: formatTime(elapsedSeconds) });
  });

  abortBtn.addEventListener('click', () => {
    removeBar();
    onCancel();
  });

  return removeBar;
}

/**
 * 3. مودال التحديث السريع بعد انتهاء الجلسة لتقييم الإنجاز وتدوين الملاحظات
 */
export function renderQuickUpdateModal({
  topicTitle,
  formattedDuration,
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
      <h3 id="quick-update-title">تسجيل إنجاز الجلسة</h3>
      <p class="modal-description" style="margin-bottom:var(--space-3);">
        الموضوع: <strong>${escapeHtml(topicTitle)}</strong> — المدة: <span class="font-en" style="font-weight:600;color:var(--color-accent);">${formattedDuration}</span>
      </p>

      <form id="quick-update-form">
        <div class="field">
          <label class="field-label">ما هي حالة الموضوع الأكاديمي الآن؟</label>
          <div class="quick-status-group">
            <label class="status-option">
              <input type="radio" name="topicStatus" value="completed" checked />
              <div>
                <strong>مكتمل (Completed)</strong>
                <p>أنجزت الموضوع بالكامل ويمكن الانتقال للموضوع التالي.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="in_progress" />
              <div>
                <strong>قيد المتابعة (In Progress)</strong>
                <p>أحرزت تقدماً جيداً ولكنه يحتاج جلسة إضافية لاستكماله.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="needs_review" />
              <div>
                <strong>يحتاج مراجعة (Needs Review)</strong>
                <p>تمت دراسته لكنه يتطلب مراجعة أو حل تدريبات وامتحانات سابقة.</p>
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
            placeholder="دوّن أين توقفت، أسئلة للدكتور، أو نقاط تحتاج تركيزاً..."
            rows="3"
          ></textarea>
        </div>

        <p id="quick-update-error" class="field-error"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-update-btn">تخطي دون حفظ</button>
          <button type="submit" class="btn-primary" id="save-update-btn">
            ${icons.check(15)}
            <span>حفظ وتحديث المساق</span>
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
    if (overlay.parentElement) {
      document.body.removeChild(overlay);
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') cleanup();
  }

  window.addEventListener('keydown', handleKeyDown);
  cancelBtn.addEventListener('click', cleanup);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });

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
      errorEl.textContent = result.error.message || 'فشل حفظ الجلسة، حاول مرة ثانية.';
      saveBtn.disabled = false;
      saveBtn.classList.remove('btn-loading');
    } else {
      cleanup();
    }
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