// src/components/ActiveSessionModal.js
// مكونات واجهة إعداد الجلسة، المؤقت الحي العائم، ومودال التحديث السريع والملاحظات.

/**
 * مودال اختيار الموضوع قبل بدء الجلسة — يدعم القوائم التتابعية (Cascading Dropdowns):
 * اختيار الموضوع الأساسي أولاً، ثم إظهار المواضيع الفرعية تلقائياً إن وُجدت.
 */
export function renderSessionSetupModal({
  topics = [],
  currentTopicId = null,
  onStart,
  onClose = () => {},
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // تصنيف المواضيع إلى أساسية وفرعية
  const rootTopics = topics.filter((t) => !t.parent_id);

  function getSubtopics(parentId) {
    return topics.filter((t) => t.parent_id === parentId);
  }

  // تحديد الموضوع الأساسي المبدئي بناءً على الموضع الحالي
  let initialRootId = null;
  let initialSubtopicId = null;

  if (currentTopicId) {
    const target = topics.find((t) => t.id === currentTopicId);
    if (target) {
      if (!target.parent_id) {
        initialRootId = target.id;
      } else {
        initialSubtopicId = target.id;
        // البحث عن الجذر في حال كان العمق أكثر من مستوى
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

  const rootOptionsHtml = rootTopics.map((t) => {
    const isSelected = t.id === initialRootId;
    return `<option value="${t.id}" ${isSelected ? 'selected' : ''}>${t.title} [${t.status}]</option>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <h3>بدء جلسة دراسة</h3>
      <p style="font-size:14px;color:var(--text);margin-bottom:1rem;">
        حدد ما تريد التركيز عليه في هذه الجلسة:
      </p>

      <form id="session-setup-form">
        <div style="margin-bottom:1rem;">
          <label style="font-weight:600;display:block;margin-bottom:6px;">الموضوع الأساسي</label>
          <select name="rootTopicId" id="session-root-topic-select" required>
            ${rootOptionsHtml || '<option value="" disabled selected>لا يوجد مواضيع متاحة</option>'}
          </select>
        </div>

        <div id="subtopic-container" style="margin-bottom:1.25rem;">
          <!-- يتم ملء القائمة الفرعية ديناميكياً بواسطة JavaScript -->
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-setup-btn">إلغاء</button>
          <button type="submit" class="btn-primary" style="background:#10b981;">
            ⏱️ ابدأ المذاكرة الآن
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

    const subOptionsHtml = subtopics.map((st) => {
      const isSelected = st.id === preselectedSubId;
      return `<option value="${st.id}" ${isSelected ? 'selected' : ''}>↳ ${st.title} [${st.status}]</option>`;
    }).join('');

    subtopicContainer.innerHTML = `
      <label style="font-weight:600;display:block;margin-bottom:6px;">الموضوع الفرعي (اختياري)</label>
      <select name="subTopicId" id="session-subtopic-select">
        <option value="">-- دراسة الموضوع الأساسي بشكل عام --</option>
        ${subOptionsHtml}
      </select>
    `;
  }

  // التهيئة الأولى للمواضيع الفرعية
  if (initialRootId) {
    updateSubtopicDropdown(initialRootId, initialSubtopicId);
  }

  // تحديث قائمة الفروع فور تغيير الموضوع الأساسي
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

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedRootId = rootSelect.value;
    const subSelect = overlay.querySelector('#session-subtopic-select');
    const selectedSubId = subSelect ? subSelect.value : null;

    // إذا اختار موضوع فرعي نعتمد عليه، وإلا نعتمد الموضوع الأساسي
    const finalTopicId = selectedSubId || selectedRootId;
    const finalTopic = topics.find((t) => t.id === finalTopicId);

    cleanup();
    onStart(finalTopicId, finalTopic?.title || 'موضوع عام');
  });
}

/**
 * شريط المؤقت الحي العائم أثناء المذاكرة
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
    <div style="display:flex;align-items:center;gap:0.75rem;min-width:0;">
      <span class="active-session-pulse"></span>
      <div style="display:flex;flex-direction:column;min-width:0;">
        <span style="font-size:11px;color:var(--text);font-weight:500;">جلسة نشطة</span>
        <span style="font-weight:600;font-size:14px;color:var(--text-h);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;">
          ${topicTitle}
        </span>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:1rem;">
      <span id="session-timer-display" class="session-timer-clock">00:00</span>
      <button type="button" id="finish-session-btn" class="btn-primary" style="background:#10b981;font-size:13px;padding:6px 14px;">
        إنهاء الجلسة
      </button>
      <button type="button" id="abort-session-btn" class="btn-secondary" style="font-size:12px;padding:5px 10px;" title="إلغاء الجلسة دون حفظ">
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
 * مودال التحديث السريع بعد انتهاء الجلسة لتقييم الإنجاز وتدوين الملاحظات
 */
export function renderQuickUpdateModal({
  topicTitle,
  formattedDuration,
  onSave,
  onClose = () => {},
}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 440px;">
      <h3 style="margin-bottom:0.25rem;">تسجيل إنجاز الجلسة 🎯</h3>
      <p style="font-size:13px;color:var(--text);margin-bottom:1rem;">
        الموضوع: <strong>${topicTitle}</strong> <br/>
        المدة المستغرقة: <span style="font-weight:600;color:#10b981;">${formattedDuration}</span>
      </p>

      <form id="quick-update-form">
        <div style="margin-bottom:1rem;">
          <label style="font-weight:600;margin-bottom:6px;">ما هي حالة الموضوع الآن؟</label>
          <div class="quick-status-group">
            <label class="status-option">
              <input type="radio" name="topicStatus" value="completed" checked />
              <div>
                <strong>مكتمل (Completed)</strong>
                <p>أنجزت الموضوع بالكامل وانتقل للموضوع التالي.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="in_progress" />
              <div>
                <strong>قيد المتابعة (In Progress)</strong>
                <p>أحرزت تقدماً ولكني سأكمله في جلسة قادمة.</p>
              </div>
            </label>

            <label class="status-option">
              <input type="radio" name="topicStatus" value="needs_review" />
              <div>
                <strong>يحتاج مراجعة (Needs Review)</strong>
                <p>تم الانتهاء منه لكنه يتطلب مراجعة أو حل تمارين.</p>
              </div>
            </label>
          </div>
        </div>

        <div style="margin-bottom:1rem;">
          <label for="session-notes" style="font-weight:600;margin-bottom:6px;">ملاحظات الجلسة (اختياري)</label>
          <textarea
            id="session-notes"
            name="notes"
            placeholder="مثال: توقفت عند صفحة 35، المسألة رقم 4 بحاجة لسؤال الدكتور..."
            rows="3"
            class="session-notes-input"
          ></textarea>
        </div>

        <p id="quick-update-error" style="color:#ef4444;font-size:13px;margin:0 0 0.5rem;"></p>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancel-update-btn">تخطي دون حفظ</button>
          <button type="submit" class="btn-primary" id="save-update-btn" style="background:#10b981;">
            حفظ وتحديث المساق
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ...';

    const formData = new FormData(form);
    const topicStatus = formData.get('topicStatus');
    const notes = formData.get('notes');

    const result = await onSave({ topicStatus, notes });

    if (result?.error) {
      errorEl.textContent = result.error.message || 'فشل حفظ الجلسة، حاول مرة ثانية';
      saveBtn.disabled = false;
      saveBtn.textContent = 'حفظ وتحديث المساق';
    } else {
      cleanup();
    }
  });
}