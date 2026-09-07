// src/pages/CourseDetailPage.js
import { supabase } from '../api/supabaseClient.js';
import {
  fetchTopicTree,
  updateTopic,
  updateTopicStatus,
  completeTopicAndAdvance,
  createTopic,
  deleteTopic,
} from '../api/topics.js';

import { fetchCourseStudyStats } from '../api/studySessions.js';
import { getUpcomingUrgentAssessment } from '../api/assessments.js';

import {
  startNewGlobalSession,
  isSessionActive,
  subscribeToSession,
} from '../utils/sessionManager.js';

import { showToast } from '../utils/toast.js';
import { renderAssessmentsView } from '../components/AssessmentsTable.js';
import { renderTopicNode } from '../components/TopicNode.js';
import { renderTopicForm } from '../components/TopicForm.js';
import {
  renderEditTopicModal,
  renderDeleteTopicModal,
} from '../components/TopicModals.js';
import { renderSessionSetupModal } from '../components/ActiveSessionModal.js';
import { icons } from '../utils/icons.js';
import { skeletons } from '../utils/skeletons.js';

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

export async function renderCourseDetailPage(
  container,
  { courseId, currentPositionTopicId = null, onBack }
) {
  let activePositionTopicId = currentPositionTopicId;
  let rawTopicsList = [];
  let currentCourseData = null;
  let assessmentsMounted = false;

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

      <!-- شريط التنبيه الذكي للاستحقاقات العاجلة -->
      <div id="urgent-alert-container"></div>

      <!-- حاوية الإحصائيات -->
      <section id="course-metrics-section" style="margin-bottom:var(--space-6);"></section>

      <div class="tabs" role="tablist">
        <button type="button" class="tab active" id="tab-btn-tree" role="tab" aria-selected="true">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${icons.folderTree(16)}
            <span>شجرة المحتوى (Topic Tree)</span>
          </span>
        </button>
        <button type="button" class="tab" id="tab-btn-assessments" role="tab" aria-selected="false">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            ${icons.calendar(16)}
            <span>الاستحقاقات والتقييمات (Assessments)</span>
          </span>
        </button>
      </div>

      <section id="tree-view-section">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4);">
          <button
            type="button"
            id="add-root-topic-btn"
            class="btn-secondary"
          >
            ${icons.plus(16)}
            <span>إضافة موضوع رئيسي</span>
          </button>
        </div>

        <div id="topic-form-container"></div>
        <div id="tree-container" style="display:flex;flex-direction:column;gap:var(--space-2);"></div>
      </section>

      <section id="assessments-view-section" style="display:none;"></section>
    </div>
  `;

  const backBtn = container.querySelector('#back-to-courses-btn');
  const startSessionBtn = container.querySelector('#start-study-session-btn');
  const tabBtnTree = container.querySelector('#tab-btn-tree');
  const tabBtnAssessments = container.querySelector('#tab-btn-assessments');
  const treeViewSection = container.querySelector('#tree-view-section');
  const assessmentsViewSection = container.querySelector('#assessments-view-section');
  const metricsSection = container.querySelector('#course-metrics-section');
  const urgentAlertEl = container.querySelector('#urgent-alert-container');

  const courseTitleEl = container.querySelector('#course-page-title');
  const courseCodeEl = container.querySelector('#course-code-badge');

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
      loadAndRenderTree();
    }
  });

  updateStartButtonState();

  tabBtnTree.addEventListener('click', () => {
    tabBtnTree.classList.add('active');
    tabBtnTree.setAttribute('aria-selected', 'true');
    tabBtnAssessments.classList.remove('active');
    tabBtnAssessments.setAttribute('aria-selected', 'false');
    treeViewSection.style.display = 'block';
    assessmentsViewSection.style.display = 'none';
  });

  tabBtnAssessments.addEventListener('click', () => {
    tabBtnAssessments.classList.add('active');
    tabBtnAssessments.setAttribute('aria-selected', 'true');
    tabBtnTree.classList.remove('active');
    tabBtnTree.setAttribute('aria-selected', 'false');
    treeViewSection.style.display = 'none';
    assessmentsViewSection.style.display = 'block';

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

        await loadAndRenderTree();
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
        await loadAndRenderTree();
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

        await loadAndRenderTree();
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

  async function loadAndRenderTree() {
    treeContainer.innerHTML = skeletons.tree(4);

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
    renderMetrics(rawTopicsList, studyStats);

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

    if (!activePositionTopicId) {
      const firstIncomplete =
        topics.find(
          (t) =>
            t.status !== 'completed' &&
            (!t.children || t.children.length === 0)
        ) ||
        topics.find((t) => t.status !== 'completed') ||
        topics[0];

      if (firstIncomplete) {
        activePositionTopicId = firstIncomplete.id;
      }
    }

    const topicTree = buildTopicTree(topics);
    treeContainer.innerHTML = '';

    topicTree.forEach((topic) => {
      const node = renderTopicNode(topic, topic.children, {
        currentTopicId: activePositionTopicId,
        onStatusChange: async (topicId, newStatus) => {
          if (newStatus === 'completed') {
            const { nextTopicId, error: completeErr } =
              await completeTopicAndAdvance(courseId, topicId);

            if (completeErr) {
              console.error('Failed to advance topic:', completeErr);
              return;
            }
            activePositionTopicId = nextTopicId;
          } else {
            const { error: updateErr } = await updateTopicStatus(
              topicId,
              newStatus
            );
            if (updateErr) {
              console.error('Failed to update status:', updateErr);
              return;
            }
          }
          await loadAndRenderTree();
        },
        onAddChild: (parentTopic) => openTopicForm(parentTopic),
        onEdit: (topicToEdit) => handleOpenEditTopic(topicToEdit),
        onDelete: (topicToDelete, isParent, childCount) =>
          handleOpenDeleteTopic(topicToDelete, isParent, childCount),
      });

      treeContainer.appendChild(node);
    });

    if (activePositionTopicId) {
      requestAnimationFrame(scrollToCurrentPosition);
    }
  }

  loadAndRenderTree();

  return () => {
    unsubscribeSession();
    formOpen = false;
    formContainer.innerHTML = '';
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}