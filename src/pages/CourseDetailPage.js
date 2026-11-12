// src/pages/CourseDetailPage.js
import { supabase } from '../api/supabaseClient.js';
import {
  fetchTopicTree,
  updateTopic,
  updateTopicStatus,
  completeTopicAndAdvance,
  markAllCourseTopicsCompleted,
  createTopic,
  deleteTopic,
} from '../api/topics.js';

import { fetchCourseStudyStats } from '../api/studySessions.js';
import { getUpcomingUrgentAssessment } from '../api/assessments.js';
import { updateCourseCurrentPosition } from '../api/courses.js';

import {
  startNewGlobalSession,
  isSessionActive,
  subscribeToSession,
} from '../utils/sessionManager.js';

import { showToast } from '../utils/toast.js';
import { renderAssessmentsView } from '../components/AssessmentsTable.js';
import { renderStudySessionLog } from '../components/StudySessionLog.js';
import {
  renderTopicNode,
  getTopicStatusBadgeClass,
  getTopicStatusLabel,
} from '../components/TopicNode.js';
import { renderTopicForm } from '../components/TopicForm.js';
import {
  renderEditTopicModal,
  renderDeleteTopicModal,
  renderCompleteAllTopicsModal,
} from '../components/TopicModals.js';
import { renderSessionSetupModal } from '../components/ActiveSessionModal.js';
import { icons } from '../utils/icons.js';
import { skeletons } from '../utils/skeletons.js';
import { escapeHtml } from '../utils/sanitize.js';

function buildTopicTree(topics) {
  const topicMap = new Map();
  const rootTopics = [];

  topics.forEach((topic) => {
    topicMap.set(topic.id, {
      ...topic,
      children: [],
    });
  });

  topics.forEach((topic) => {
    const currentTopic = topicMap.get(topic.id);

    if (!topic.parent_id) {
      rootTopics.push(currentTopic);
      return;
    }

    const parentTopic = topicMap.get(topic.parent_id);
    if (parentTopic) {
      parentTopic.children.push(currentTopic);
    }
  });

  rootTopics.sort((a, b) => Number(a.order) - Number(b.order));

  function sortChildren(topic) {
    topic.children.sort((a, b) => Number(a.order) - Number(b.order));
    topic.children.forEach((child) => sortChildren(child));
  }

  rootTopics.forEach((topic) => sortChildren(topic));
  return rootTopics;
}

function getOrderedLeafTopics(topics) {
  const tree = buildTopicTree(topics);
  const leaves = [];

  function traverse(node) {
    if (!node.children || node.children.length === 0) {
      leaves.push(node);
    } else {
      node.children.forEach(traverse);
    }
  }

  tree.forEach(traverse);
  return leaves;
}

export async function renderCourseDetailPage(
  container,
  { courseId, currentPositionTopicId = null, onBack }
) {
  let activePositionTopicId = currentPositionTopicId;
  let rawTopicsList = [];
  let currentCourseData = null;
  let currentStudyStats = { totalSeconds: 0, completedSessionsCount: 0 };
  let expandedTopicIds = new Set();
  let hasInitialRendered = false;
  let assessmentsMounted = false;
  let logMounted = false;

  container.innerHTML = `
    <div class="page-container">
      <nav style="margin-bottom:var(--space-4);">
        <button
          type="button"
          id="back-to-courses-btn"
          class="btn-tertiary"
          style="display:inline-flex;align-items:center;gap:6px;padding:0;font-size:14px;color:var(--color-text-secondary);"
        >
          ${icons.arrowRight(16)}
          <span>العودة للمساقات</span>
        </button>
      </nav>

      <header style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-5);flex-wrap:wrap;">
        <div>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);">
            <h1 id="course-page-title" style="margin:0;">جاري تحميل المساق...</h1>
            <span id="course-code-badge" class="badge" style="display:none;background:var(--color-bg-subtle);color:var(--color-text-secondary);font-family:monospace;"></span>
          </div>
          <p class="text-secondary" style="font-size:14px;">مركز القيادة الأكاديمي: شجرة المحتوى، معدل التقدم، وجلسات المذاكرة.</p>
        </div>

        <button
          type="button"
          id="start-study-session-btn"
          class="btn-primary"
          style="min-height:42px;"
        >
          ${icons.play(16)}
          <span>ابدأ جلسة دراسة</span>
        </button>
      </header>

      <div id="urgent-alert-container"></div>

      <section id="course-metrics-section" style="margin-bottom:var(--space-6);"></section>

      <div class="tabs" role="tablist">
        <button type="button" class="tab active" id="tab-btn-tree" role="tab" aria-selected="true">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${icons.folderTree(16)}
            <span>شجرة المحتوى الدراسي</span>
          </span>
        </button>
        <button type="button" class="tab" id="tab-btn-assessments" role="tab" aria-selected="false">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${icons.calendar(16)}
            <span>الاستحقاقات والتقييمات</span>
          </span>
        </button>
        <button type="button" class="tab" id="tab-btn-log" role="tab" aria-selected="false">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${icons.play(16)}
            <span>سجل الجلسات</span>
          </span>
        </button>
      </div>

      <section id="tree-view-section">
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap;">
          <button
            type="button"
            id="complete-all-topics-btn"
            class="btn-tertiary"
            style="min-height:36px;display:inline-flex;align-items:center;gap:6px;"
          >
            ${icons.check(16)}
            <span>إكمال جميع المواضيع</span>
          </button>
          <button
            type="button"
            id="add-root-topic-btn"
            class="btn-secondary"
            style="min-height:36px;display:inline-flex;align-items:center;gap:6px;"
          >
            ${icons.plus(16)}
            <span>إضافة موضوع رئيسي</span>
          </button>
        </div>

        <div id="topic-form-container"></div>
        <div id="tree-container" style="display:flex;flex-direction:column;gap:var(--space-2);"></div>
      </section>

      <section id="assessments-view-section" style="display:none;"></section>
      <section id="log-view-section" style="display:none;"></section>
    </div>
  `;

  const backBtn = container.querySelector('#back-to-courses-btn');
  const startSessionBtn = container.querySelector('#start-study-session-btn');
  
  const tabBtnTree = container.querySelector('#tab-btn-tree');
  const tabBtnAssessments = container.querySelector('#tab-btn-assessments');
  const tabBtnLog = container.querySelector('#tab-btn-log');

  const treeViewSection = container.querySelector('#tree-view-section');
  const assessmentsViewSection = container.querySelector('#assessments-view-section');
  const logViewSection = container.querySelector('#log-view-section');

  const metricsSection = container.querySelector('#course-metrics-section');
  const urgentAlertEl = container.querySelector('#urgent-alert-container');

  const courseTitleEl = container.querySelector('#course-page-title');
  const courseCodeEl = container.querySelector('#course-code-badge');

  const completeAllTopicsBtn = container.querySelector('#complete-all-topics-btn');
  const addRootBtn = container.querySelector('#add-root-topic-btn');
  const formContainer = container.querySelector('#topic-form-container');
  const treeContainer = container.querySelector('#tree-container');

  let formOpen = false;

  function updateStartButtonState() {
    if (isSessionActive()) {
      startSessionBtn.disabled = true;
      startSessionBtn.title = 'لديك جلسة مذاكرة نشطة حالياً';
    } else {
      startSessionBtn.disabled = false;
      startSessionBtn.removeAttribute('title');
    }
  }

  const unsubscribeSession = subscribeToSession(({ event, session, nextTopicId }) => {
    updateStartButtonState();

    if (event === 'completed' && session?.course_id === courseId) {
      if (nextTopicId) {
        activePositionTopicId = nextTopicId;
      }
      loadAndRenderTree({ showSkeleton: false, shouldScroll: false });
    }
  });

  updateStartButtonState();

  function switchTab(activeTabBtn, activeSection) {
    [tabBtnTree, tabBtnAssessments, tabBtnLog].forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    [treeViewSection, assessmentsViewSection, logViewSection].forEach((sec) => {
      sec.style.display = 'none';
    });

    activeTabBtn.classList.add('active');
    activeTabBtn.setAttribute('aria-selected', 'true');
    activeSection.style.display = 'block';
  }

  tabBtnTree.addEventListener('click', () => switchTab(tabBtnTree, treeViewSection));

  tabBtnAssessments.addEventListener('click', () => {
    switchTab(tabBtnAssessments, assessmentsViewSection);
    if (!assessmentsMounted) {
      renderAssessmentsView(assessmentsViewSection, {
        courseId,
        onAssessmentsChange: async () => {
          const urgent = await getUpcomingUrgentAssessment(courseId);
          renderUrgentAlert(urgent);
        },
      });
      assessmentsMounted = true;
    }
  });

  tabBtnLog.addEventListener('click', () => {
    switchTab(tabBtnLog, logViewSection);
    if (!logMounted) {
      renderStudySessionLog(logViewSection, {
        courseId,
        topics: rawTopicsList,
        onSessionsChange: async () => {
          const studyStats = await fetchCourseStudyStats(courseId);
          if (studyStats) currentStudyStats = studyStats;
          renderMetrics(rawTopicsList, currentStudyStats);
        },
      });
      logMounted = true;
    }
  });

  backBtn.addEventListener('click', () => {
    onBack();
  });

  function closeTopicForm() {
    formOpen = false;
    formContainer.innerHTML = '';
  }

  function openTopicForm(parentTopic = null) {
    formOpen = true;
    formContainer.innerHTML = '';

    renderTopicForm(formContainer, {
      parentTopic,
      onCancel: () => closeTopicForm(),
      onSave: async ({ title, parentId }) => {
        const { topic, error } = await createTopic({
          courseId,
          parentId,
          title,
        });

        if (error) return { error };

        closeTopicForm();

        if (!activePositionTopicId && topic) {
          activePositionTopicId = topic.id;
        }

        await loadAndRenderTree({ showSkeleton: false, shouldScroll: false });
        return { topic, error: null };
      },
    });
  }

  addRootBtn.addEventListener('click', () => {
    if (formOpen) {
      closeTopicForm();
      return;
    }
    openTopicForm();
  });

  function updateCompleteAllTopicsBtnState() {
    if (!completeAllTopicsBtn) return;
    const allCompleted =
      rawTopicsList.length > 0 &&
      rawTopicsList.every((t) => t.status === 'completed');

    if (rawTopicsList.length === 0) {
      completeAllTopicsBtn.disabled = true;
      completeAllTopicsBtn.classList.remove('btn-secondary');
      completeAllTopicsBtn.classList.add('btn-tertiary');
      completeAllTopicsBtn.innerHTML = `${icons.check(16)} <span>إكمال جميع المواضيع</span>`;
      completeAllTopicsBtn.title = 'لا توجد مواضيع دراسية بعد';
    } else if (allCompleted) {
      completeAllTopicsBtn.disabled = true;
      completeAllTopicsBtn.classList.remove('btn-tertiary');
      completeAllTopicsBtn.classList.add('btn-secondary');
      completeAllTopicsBtn.innerHTML = `${icons.check(16)} <span>جميع المواضيع مكتملة</span>`;
      completeAllTopicsBtn.title = 'تم إنجاز كافة محتويات هذا المساق بالكامل';
    } else {
      completeAllTopicsBtn.disabled = false;
      completeAllTopicsBtn.classList.remove('btn-secondary');
      completeAllTopicsBtn.classList.add('btn-tertiary');
      completeAllTopicsBtn.innerHTML = `${icons.check(16)} <span>إكمال جميع المواضيع</span>`;
      completeAllTopicsBtn.removeAttribute('title');
    }
  }

  function updateParentTopicStatusBadges() {
    const parentMap = new Map();
    rawTopicsList.forEach((t) => {
      if (t.parent_id) {
        if (!parentMap.has(t.parent_id)) parentMap.set(t.parent_id, []);
        parentMap.get(t.parent_id).push(t);
      }
    });

    parentMap.forEach((children, parentId) => {
      const parentTopic = rawTopicsList.find((t) => t.id === parentId);
      if (!parentTopic) return;
      const allChildrenCompleted = children.every((c) => c.status === 'completed');
      const anyChildInProgress = children.some(
        (c) => c.status === 'in_progress' || c.status === 'completed'
      );

      const newParentStatus = allChildrenCompleted
        ? 'completed'
        : anyChildInProgress
        ? 'in_progress'
        : 'not_started';

      if (parentTopic.status !== newParentStatus) {
        parentTopic.status = newParentStatus;
        const parentWrapper = treeContainer.querySelector(
          `[data-topic-id="${CSS.escape(parentId)}"]`
        );
        if (parentWrapper) {
          const badgeEl = parentWrapper.querySelector('.topic-parent-status-badge');
          if (badgeEl) {
            badgeEl.className = `${getTopicStatusBadgeClass(newParentStatus)} topic-parent-status-badge`;
            badgeEl.textContent = getTopicStatusLabel(newParentStatus);
          }
        }
      }
    });
  }

  async function handleTopicStatusChange(topicId, newStatus, previousStatus) {
    const topic = rawTopicsList.find((t) => t.id === topicId);
    if (!topic) return { error: new Error('الموضوع غير موجود') };

    // 1. تحديث الحالة المحلية فوراً (Optimistic UI)
    topic.status = newStatus;

    // 2. تحديث بطاقة المؤشرات والنسبة المئوية فوراً دون انتظار الشبكة
    renderMetrics(rawTopicsList, currentStudyStats);

    const changedWrapper = treeContainer.querySelector(
      `[data-topic-id="${CSS.escape(topicId)}"]`
    );

    // 3. إذا كان هذا الموضوع هو "الموضع الحالي" وتم إكماله، إزالة الشارة والتنسيق منه
    const wasActiveTopic = activePositionTopicId === topicId;
    if (wasActiveTopic && newStatus === 'completed') {
      if (changedWrapper) {
        changedWrapper.removeAttribute('data-current-position');
        changedWrapper.removeAttribute('aria-current');
        const rowEl = changedWrapper.querySelector('.topic-node-row');
        if (rowEl) {
          rowEl.classList.remove('highlight-current-position');
          rowEl.style.border = '1px solid var(--color-border)';
          rowEl.style.background = 'var(--color-surface)';
        }
        const badgeEl = changedWrapper.querySelector('.current-position-badge');
        if (badgeEl) badgeEl.remove();
        const titleText = changedWrapper.querySelector('.topic-title-text');
        if (titleText) {
          titleText.style.color = 'var(--color-text)';
          titleText.style.fontWeight = '400';
        }
      }
    }

    if (newStatus === 'completed') {
      const { nextTopicId, error: completeErr } = await completeTopicAndAdvance(
        courseId,
        topicId
      );

      if (completeErr) {
        console.error('Failed to advance topic:', completeErr);
        // التراجع عند الخطأ
        topic.status = previousStatus;
        renderMetrics(rawTopicsList, currentStudyStats);
        updateCompleteAllTopicsBtnState();
        updateParentTopicStatusBadges();
        showToast(completeErr.message || 'فشل تحديث حالة الموضوع', 'error');
        return { error: completeErr };
      }

      activePositionTopicId = nextTopicId;

      if (nextTopicId) {
        const nextWrapper = treeContainer.querySelector(
          `[data-topic-id="${CSS.escape(nextTopicId)}"]`
        );

        if (nextWrapper) {
          // توسيع المجلدات الأب إذا كانت مطوية ليظهر الموضوع التالي للطالب
          let parentEl = nextWrapper.parentElement;
          while (parentEl && parentEl !== treeContainer) {
            if (parentEl.hidden) {
              parentEl.hidden = false;
              const parentWrapper = parentEl.closest('[data-topic-id]');
              if (parentWrapper) {
                expandedTopicIds.add(parentWrapper.dataset.topicId);
                const toggleBtn = parentWrapper.querySelector('button.btn-icon');
                if (toggleBtn) {
                  toggleBtn.innerHTML = icons.chevronDown(14);
                  toggleBtn.setAttribute('aria-expanded', 'true');
                  toggleBtn.setAttribute('aria-label', 'طي المواضيع الفرعية');
                }
              }
            }
            parentEl = parentEl.parentElement;
          }

          // تطبيق تنسيق الموضع الحالي ومؤثر الـ Glow/Pulse اللطيف دون تمرير الشاشة
          nextWrapper.dataset.currentPosition = 'true';
          nextWrapper.setAttribute('aria-current', 'location');
          const nextRow = nextWrapper.querySelector('.topic-node-row');
          if (nextRow) {
            nextRow.style.border = '1px solid var(--color-accent-border)';
            nextRow.style.background = 'var(--color-accent-soft)';
            nextRow.classList.add('highlight-current-position');
            setTimeout(() => {
              nextRow.classList.remove('highlight-current-position');
            }, 2000);
          }

          const nextTitleContainer = nextWrapper.querySelector(
            '.topic-node-row > div:first-child'
          );
          const nextTitleText = nextWrapper.querySelector('.topic-title-text');
          if (nextTitleText) {
            nextTitleText.style.color = 'var(--color-accent)';
            nextTitleText.style.fontWeight = '600';
          }
          if (
            nextTitleContainer &&
            !nextTitleContainer.querySelector('.current-position-badge')
          ) {
            const currentBadge = document.createElement('span');
            currentBadge.className = 'badge badge-accent current-position-badge';
            currentBadge.textContent = 'الموضع الحالي';
            currentBadge.style.fontSize = '11px';
            currentBadge.style.flexShrink = '0';
            if (nextTitleText && nextTitleText.nextSibling) {
              nextTitleContainer.insertBefore(currentBadge, nextTitleText.nextSibling);
            } else {
              nextTitleContainer.appendChild(currentBadge);
            }
          }
        }
      }
    } else {
      const { error: updateErr } = await updateTopicStatus(topicId, newStatus);
      if (updateErr) {
        console.error('Failed to update status:', updateErr);
        topic.status = previousStatus;
        renderMetrics(rawTopicsList, currentStudyStats);
        updateCompleteAllTopicsBtnState();
        updateParentTopicStatusBadges();
        showToast(updateErr.message || 'فشل تحديث حالة الموضوع', 'error');
        return { error: updateErr };
      }

      const orderedLeaves = getOrderedLeafTopics(rawTopicsList);
      const changedIndex = orderedLeaves.findIndex((t) => t.id === topicId);
      const currentIndex = activePositionTopicId
        ? orderedLeaves.findIndex((t) => t.id === activePositionTopicId)
        : -1;

      // قاعدة الترتيب: إعادة التحديد للخلف إذا كان الموضوع المُعدل يسبق الموضع الحالي في الترتيب،
      // أو إذا لم يكن هناك موضع حالي محدد (مثلاً كانت كل المواضيع مكتملة سابقاً)
      const shouldMovePositionBack =
        !activePositionTopicId ||
        currentIndex === -1 ||
        (changedIndex !== -1 && changedIndex < currentIndex);

      if (shouldMovePositionBack) {
        // إزالة التنسيق والشارة من الموضع الحالي السابق إذا كان مختلفاً
        if (activePositionTopicId && activePositionTopicId !== topicId) {
          const prevWrapper = treeContainer.querySelector(
            `[data-topic-id="${CSS.escape(activePositionTopicId)}"]`
          );
          if (prevWrapper) {
            prevWrapper.removeAttribute('data-current-position');
            prevWrapper.removeAttribute('aria-current');
            const prevRow = prevWrapper.querySelector('.topic-node-row');
            if (prevRow) {
              prevRow.classList.remove('highlight-current-position');
              prevRow.style.border = '1px solid var(--color-border)';
              prevRow.style.background = 'var(--color-surface)';
            }
            const prevBadge = prevWrapper.querySelector('.current-position-badge');
            if (prevBadge) prevBadge.remove();
            const prevTitle = prevWrapper.querySelector('.topic-title-text');
            if (prevTitle) {
              prevTitle.style.color = 'var(--color-text)';
              prevTitle.style.fontWeight = '400';
            }
          }
        }

        activePositionTopicId = topicId;

        // حفظ الموضع الجديد المتراجع عنه في قاعدة البيانات
        updateCourseCurrentPosition(courseId, topicId).catch((cErr) => {
          console.error('Failed to update course current position:', cErr);
        });

        if (changedWrapper) {
          // توسيع المجلدات الأب إذا كانت مطوية ليظهر الموضوع السابق بوضوح
          let parentEl = changedWrapper.parentElement;
          while (parentEl && parentEl !== treeContainer) {
            if (parentEl.hidden) {
              parentEl.hidden = false;
              const parentWrapper = parentEl.closest('[data-topic-id]');
              if (parentWrapper) {
                expandedTopicIds.add(parentWrapper.dataset.topicId);
                const toggleBtn = parentWrapper.querySelector('button.btn-icon');
                if (toggleBtn) {
                  toggleBtn.innerHTML = icons.chevronDown(14);
                  toggleBtn.setAttribute('aria-expanded', 'true');
                  toggleBtn.setAttribute('aria-label', 'طي المواضيع الفرعية');
                }
              }
            }
            parentEl = parentEl.parentElement;
          }

          changedWrapper.dataset.currentPosition = 'true';
          changedWrapper.setAttribute('aria-current', 'location');
          const rowEl = changedWrapper.querySelector('.topic-node-row');
          if (rowEl) {
            rowEl.style.border = '1px solid var(--color-accent-border)';
            rowEl.style.background = 'var(--color-accent-soft)';
            rowEl.classList.add('highlight-current-position');
            setTimeout(() => {
              rowEl.classList.remove('highlight-current-position');
            }, 2000);
          }
          const titleContainer = changedWrapper.querySelector(
            '.topic-node-row > div:first-child'
          );
          const titleText = changedWrapper.querySelector('.topic-title-text');
          if (titleText) {
            titleText.style.color = 'var(--color-accent)';
            titleText.style.fontWeight = '600';
          }
          if (
            titleContainer &&
            !titleContainer.querySelector('.current-position-badge')
          ) {
            const currentBadge = document.createElement('span');
            currentBadge.className = 'badge badge-accent current-position-badge';
            currentBadge.textContent = 'الموضع الحالي';
            currentBadge.style.fontSize = '11px';
            currentBadge.style.flexShrink = '0';
            if (titleText && titleText.nextSibling) {
              titleContainer.insertBefore(currentBadge, titleText.nextSibling);
            } else {
              titleContainer.appendChild(currentBadge);
            }
          }
        }
      }
    }

    updateCompleteAllTopicsBtnState();
    updateParentTopicStatusBadges();

    return { error: null };
  }

  if (completeAllTopicsBtn) {
    completeAllTopicsBtn.addEventListener('click', () => {
      if (!rawTopicsList || rawTopicsList.length === 0) return;
      const allDone = rawTopicsList.every((t) => t.status === 'completed');
      if (allDone) return;

      renderCompleteAllTopicsModal({
        totalTopics: rawTopicsList.length,
        onConfirm: async () => {
          const { error: completeAllErr } = await markAllCourseTopicsCompleted(courseId);
          if (completeAllErr) {
            return { error: completeAllErr };
          }
          activePositionTopicId = null;
          showToast('تم تحديد كافة مواضيع المساق كمكتملة بنجاح', 'success');
          await loadAndRenderTree({ showSkeleton: false, shouldScroll: false });
          return { error: null };
        },
      });
    });
  }

  startSessionBtn.addEventListener('click', () => {
    if (isSessionActive()) {
      showToast('لديك جلسة نشطة بالفعل، يرجى إتمامها أو إلغاؤها أولاً', 'warning');
      return;
    }

    renderSessionSetupModal({
      topics: rawTopicsList,
      currentTopicId: activePositionTopicId,
      onStart: async (selectedTopicId, selectedTopicTitle, durationMinutes) => {
        startSessionBtn.disabled = true;
        startSessionBtn.classList.add('btn-loading');

        const actualCourseTitle =
          currentCourseData?.title ||
          currentCourseData?.name ||
          currentCourseData?.course_name ||
          'مساق دراسي';

        const { error } = await startNewGlobalSession({
          courseId,
          courseTitle: actualCourseTitle,
          topicId: selectedTopicId,
          topicTitle: selectedTopicTitle,
          durationMinutes,
        });

        startSessionBtn.classList.remove('btn-loading');

        if (error) {
          showToast(error.message || 'تعذر بدء الجلسة', 'error');
          updateStartButtonState();
        }
      },
    });
  });

  function scrollToCurrentPosition() {
    if (!activePositionTopicId) return;

    const currentNode = treeContainer.querySelector(
      `[data-topic-id="${CSS.escape(activePositionTopicId)}"]`
    );

    if (!currentNode) return;

    let parentEl = currentNode.parentElement;
    while (parentEl && parentEl !== treeContainer) {
      if (parentEl.hidden) parentEl.hidden = false;
      parentEl = parentEl.parentElement;
    }

    currentNode.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    currentNode.setAttribute('aria-current', 'location');
    currentNode.classList.add('highlight-current-position');

    setTimeout(() => {
      currentNode.classList.remove('highlight-current-position');
    }, 2500);
  }

  function handleOpenEditTopic(topic) {
    renderEditTopicModal(topic, {
      onSave: async (topicId, updates) => {
        const { error: updateErr } = await updateTopic(topicId, updates);
        if (updateErr) return { error: updateErr };
        await loadAndRenderTree({ showSkeleton: false, shouldScroll: false });
        return { error: null };
      },
    });
  }

  function handleOpenDeleteTopic(topic, isParent, childCount) {
    renderDeleteTopicModal(topic, isParent, childCount, {
      onDelete: async (topicId) => {
        const { error: deleteErr } = await deleteTopic(topicId);
        if (deleteErr) return { error: deleteErr };

        if (activePositionTopicId === topicId) {
          activePositionTopicId = null;
        }

        await loadAndRenderTree({ showSkeleton: false, shouldScroll: false });
        return { error: null };
      },
    });
  }

  function renderMetrics(topics, studyStats) {
    const totalTopics = topics.length;
    const completedTopics = topics.filter((t) => t.status === 'completed').length;
    const inProgressTopics = topics.filter((t) => t.status === 'in_progress').length;
    const needsReviewTopics = topics.filter((t) => t.status === 'needs_review').length;

    const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    function formatStudyDuration(seconds, count) {
      if (count === 0 && seconds === 0) return 'لم تبدأ بعد';

      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      const paddedSecs = String(secs).padStart(2, '0');

      if (hrs > 0) {
        const paddedMins = String(mins).padStart(2, '0');
        return `${hrs}:${paddedMins}:${paddedSecs} ساعة`;
      }

      return `${mins}:${paddedSecs} دقيقة`;
    }

    const formattedStudyTime = formatStudyDuration(
      studyStats.totalSeconds,
      studyStats.completedSessionsCount
    );

    metricsSection.innerHTML = `
      <div class="card" style="padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);flex-wrap:wrap;gap:var(--space-2);">
          <div style="display:flex;align-items:center;gap:var(--space-2);">
            <span style="font-weight:700;font-size:15px;color:var(--color-text);">نسبة إنجاز المنهج الدراسي</span>
            <span class="badge" style="background:rgba(56, 189, 248, 0.15);color:var(--color-accent);font-weight:700;">
              ${progressPercent}%
            </span>
          </div>
          <span style="font-size:13px;color:var(--color-text-secondary);">
            تم إنجاز <strong>${completedTopics}</strong> من أصل <strong>${totalTopics}</strong> موضوع
          </span>
        </div>

        <div style="width:100%;height:10px;background:var(--color-bg-subtle);border-radius:999px;overflow:hidden;margin-bottom:var(--space-4);">
          <div style="width:${progressPercent}%;height:100%;background:linear-gradient(90deg, var(--color-primary), var(--color-accent));transition:width 0.4s ease;border-radius:999px;"></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--color-border);">
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:12px;color:var(--color-text-tertiary);">وقت المذاكرة الفعلي</span>
            <span style="font-size:15px;font-weight:700;color:var(--color-text);margin-top:2px;">
              ${formattedStudyTime}
            </span>
          </div>

          <div style="display:flex;flex-direction:column;">
            <span style="font-size:12px;color:var(--color-text-tertiary);">الجلسات المكتملة</span>
            <span style="font-size:15px;font-weight:700;color:var(--color-text);margin-top:2px;">
              ${studyStats.completedSessionsCount} جلسات
            </span>
          </div>

          <div style="display:flex;flex-direction:column;">
            <span style="font-size:12px;color:var(--color-text-tertiary);">قيد المتابعة</span>
            <span style="font-size:15px;font-weight:700;color:#38bdf8;margin-top:2px;">
              ${inProgressTopics} موضوع
            </span>
          </div>

          <div style="display:flex;flex-direction:column;">
            <span style="font-size:12px;color:var(--color-text-tertiary);">بحاجة لمراجعة</span>
            <span style="font-size:15px;font-weight:700;color:#f59e0b;margin-top:2px;">
              ${needsReviewTopics} موضوع
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function renderUrgentAlert(urgentItem) {
    if (!urgentItem) {
      urgentAlertEl.innerHTML = '';
      return;
    }

    const isOverdue = urgentItem.diffDays < 0;
    const isExam = urgentItem.category === 'exam';

    let countdownText = '';
    if (isOverdue) {
      countdownText = `متأخر بـ ${Math.abs(urgentItem.diffDays)} يوم!`;
    } else if (urgentItem.diffDays === 0) {
      countdownText = 'اليوم!';
    } else if (urgentItem.diffDays === 1) {
      countdownText = 'غداً';
    } else {
      countdownText = `متبقي ${urgentItem.diffDays} أيام`;
    }

    urgentAlertEl.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:${isOverdue ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'};border:1px solid ${isOverdue ? '#ef4444' : '#f59e0b'};border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);flex-wrap:wrap;gap:var(--space-2);">
        <div style="display:flex;align-items:center;gap:var(--space-2);color:${isOverdue ? '#ef4444' : '#f59e0b'};">
          ${icons.alertTriangle(18)}
          <span style="font-size:13px;font-weight:600;">
            ${isOverdue ? 'استحقاق متأخر:' : 'استحقاق قادم قريباً:'} <strong>${escapeHtml(urgentItem.title)}</strong>
            ${isExam && urgentItem.weight ? `(امتحان • الوزن: ${urgentItem.weight}%)` : isExam ? '(امتحان)' : '(واجب أكاديمي)'}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span style="font-size:12px;color:var(--color-text-secondary);">${urgentItem.date || ''}</span>
          <span class="badge" style="background:${isOverdue ? 'var(--color-danger)' : '#f59e0b'};color:#fff;font-weight:700;font-size:11px;">
            ${countdownText}
          </span>
        </div>
      </div>
    `;
  }

  async function loadAndRenderTree({ showSkeleton = false, shouldScroll = false } = {}) {
    if (showSkeleton) {
      treeContainer.innerHTML = skeletons.tree(4);
    }

    const [{ topics, error }, studyStats, courseRes, urgentItem] = await Promise.all([
      fetchTopicTree(courseId),
      fetchCourseStudyStats(courseId),
      supabase.from('courses').select('*').eq('id', courseId).maybeSingle(),
      getUpcomingUrgentAssessment(courseId),
    ]);

    if (error) {
      treeContainer.innerHTML = `
        <div class="card error-state">
          <div class="error-state-icon" aria-hidden="true">${icons.alertTriangle(28)}</div>
          <h3>تعذر تحميل المواضيع</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
      return;
    }

    if (studyStats) {
      currentStudyStats = studyStats;
    }

    if (courseRes?.data) {
      currentCourseData = courseRes.data;
      const detectedTitle =
        currentCourseData.title ||
        currentCourseData.name ||
        currentCourseData.course_name ||
        'مساق دراسي';

      const detectedCode =
        currentCourseData.code || currentCourseData.course_code || '';

      courseTitleEl.textContent = detectedTitle;

      if (detectedCode) {
        courseCodeEl.textContent = detectedCode;
        courseCodeEl.style.display = 'inline-block';
      } else {
        courseCodeEl.style.display = 'none';
      }
    }

    renderUrgentAlert(urgentItem);

    rawTopicsList = topics ?? [];
    renderMetrics(rawTopicsList, currentStudyStats);

    const allCompleted =
      rawTopicsList.length > 0 &&
      rawTopicsList.every((t) => t.status === 'completed');

    updateCompleteAllTopicsBtnState();

    if (!topics || topics.length === 0) {
      treeContainer.innerHTML = `
        <div class="card empty-state">
          <div class="empty-state-icon" aria-hidden="true">${icons.folderTree(32)}</div>
          <h3>لا توجد مواضيع دراسية بعد</h3>
          <p>أضف أول موضوع رئيسي لهذا المساق لتقسيم محتواه الأكاديمي.</p>
        </div>
      `;
      return;
    }

    if (allCompleted) {
      activePositionTopicId = null;
    } else {
      if (activePositionTopicId) {
        const currentActiveTopic = topics.find((t) => t.id === activePositionTopicId);
        if (!currentActiveTopic || currentActiveTopic.status === 'completed') {
          activePositionTopicId = null;
        }
      }

      if (!activePositionTopicId) {
        const orderedLeaves = getOrderedLeafTopics(topics);
        const firstIncomplete = orderedLeaves.find((t) => t.status !== 'completed');

        if (firstIncomplete) {
          activePositionTopicId = firstIncomplete.id;
        }
      }
    }

    // Default initialization of expandedTopicIds on initial load
    if (!hasInitialRendered) {
      function markInitialExpanded(tList) {
        tList.forEach((t) => {
          if (t.children && t.children.length > 0) {
            if (!activePositionTopicId || containsTargetTopic(t, activePositionTopicId)) {
              expandedTopicIds.add(t.id);
            }
            markInitialExpanded(t.children);
          }
        });
      }

      function containsTargetTopic(node, targetId) {
        if (node.id === targetId) return true;
        return (node.children ?? []).some((c) => containsTargetTopic(c, targetId));
      }

      const tempTree = buildTopicTree(topics);
      markInitialExpanded(tempTree);
      hasInitialRendered = true;
    }

    const topicTree = buildTopicTree(topics);
    treeContainer.innerHTML = '';

    topicTree.forEach((topic) => {
      const node = renderTopicNode(topic, topic.children, {
        currentTopicId: activePositionTopicId,
        expandedTopicIds,
        onToggleExpand: (tId, isExpanded) => {
          if (isExpanded) {
            expandedTopicIds.add(tId);
          } else {
            expandedTopicIds.delete(tId);
          }
        },
        onStatusChange: handleTopicStatusChange,
        onAddChild: (parentTopic) => openTopicForm(parentTopic),
        onEdit: (topicToEdit) => handleOpenEditTopic(topicToEdit),
        onDelete: (topicToDelete, isParent, childCount) =>
          handleOpenDeleteTopic(topicToDelete, isParent, childCount),
      });

      treeContainer.appendChild(node);
    });

    if (shouldScroll && activePositionTopicId) {
      requestAnimationFrame(scrollToCurrentPosition);
    }
  }

  loadAndRenderTree({
    showSkeleton: true,
    shouldScroll: Boolean(currentPositionTopicId),
  });

  return () => {
    unsubscribeSession();
    formOpen = false;
    formContainer.innerHTML = '';
  };
}
