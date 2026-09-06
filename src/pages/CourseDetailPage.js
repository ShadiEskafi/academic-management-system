// src/pages/CourseDetailPage.js
// صفحة محتوى المساق — شجرة المواضيع، جلسات الدراسة الفورية، والجدول الموحد للتقييمات والاستحقاقات.

import {
  fetchTopicTree,
  updateTopic,
  updateTopicStatus,
  completeTopicAndAdvance,
  createTopic,
  deleteTopic,
} from '../api/topics.js';

import {
  startStudySession,
  completeStudySession,
} from '../api/studySessions.js';

import { renderAssessmentsView } from '../components/AssessmentsTable.js';

import { renderTopicNode } from '../components/TopicNode.js';
import { renderTopicForm } from '../components/TopicForm.js';
import {
  renderEditTopicModal,
  renderDeleteTopicModal,
} from '../components/TopicModals.js';
import {
  renderSessionSetupModal,
  renderActiveSessionBar,
  renderQuickUpdateModal,
} from '../components/ActiveSessionModal.js';

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
  let activeSessionCleanup = null;
  let assessmentsMounted = false;

  container.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:1rem;
          margin-bottom:1.25rem;
          flex-wrap:wrap;
        "
      >
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button
            id="back-to-courses-btn"
            style="
              padding:0.4rem 0.8rem;
              cursor:pointer;
            "
          >
            ← العودة للمساقات
          </button>

          <h2 style="margin:0;">
            إدارة المساق
          </h2>
        </div>

        <button
          id="start-study-session-btn"
          class="btn-primary"
          style="
            background:#10b981;
            display:inline-flex;
            align-items:center;
            gap:6px;
            font-weight:600;
            padding:0.45rem 1rem;
          "
        >
          ⏱️ ابدأ جلسة دراسة
        </button>
      </div>

      <!-- نظام التبويبات العلوي -->
      <div class="course-nav-tabs">
        <button type="button" class="course-tab-btn active" id="tab-btn-tree">
          🌳 شجرة المحتوى (Topic Tree)
        </button>
        <button type="button" class="course-tab-btn" id="tab-btn-assessments">
          📅 الاستحقاقات والتقييمات (Assessments)
        </button>
      </div>
    </div>

    <!-- حاوية قسم شجرة المواضيع -->
    <div id="tree-view-section">
      <div style="margin-bottom: 1rem;">
        <button
          id="add-root-topic-btn"
          style="
            padding:0.4rem 0.8rem;
            cursor:pointer;
          "
        >
          + Add Topic
        </button>
      </div>

      <div id="topic-form-container"></div>

      <div
        id="tree-container"
        style="
          display:flex;
          flex-direction:column;
          gap:0.25rem;
        "
      >
        جاري التحميل...
      </div>
    </div>

    <!-- حاوية قسم الاستحقاقات والتقييمات -->
    <div id="assessments-view-section" style="display:none;"></div>
  `;

  // عناصر التبويب والتحكم
  const backBtn = container.querySelector('#back-to-courses-btn');
  const startSessionBtn = container.querySelector('#start-study-session-btn');
  const tabBtnTree = container.querySelector('#tab-btn-tree');
  const tabBtnAssessments = container.querySelector('#tab-btn-assessments');
  const treeViewSection = container.querySelector('#tree-view-section');
  const assessmentsViewSection = container.querySelector('#assessments-view-section');

  // عناصر قسم الشجرة
  const addRootBtn = container.querySelector('#add-root-topic-btn');
  const formContainer = container.querySelector('#topic-form-container');
  const treeContainer = container.querySelector('#tree-container');

  let formOpen = false;

  tabBtnTree.addEventListener('click', () => {
    tabBtnTree.classList.add('active');
    tabBtnAssessments.classList.remove('active');
    treeViewSection.style.display = 'block';
    assessmentsViewSection.style.display = 'none';
  });

  tabBtnAssessments.addEventListener('click', () => {
    tabBtnAssessments.classList.add('active');
    tabBtnTree.classList.remove('active');
    treeViewSection.style.display = 'none';
    assessmentsViewSection.style.display = 'block';

    if (!assessmentsMounted) {
      renderAssessmentsView(assessmentsViewSection, { courseId });
      assessmentsMounted = true;
    }
  });

  backBtn.addEventListener('click', () => {
    if (activeSessionCleanup) activeSessionCleanup();
    onBack();
  });

  // =========================================================
  // منطق شجرة المواضيع (Topic Tree Logic)
  // =========================================================

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

  // بدء جلسة الدراسة
  startSessionBtn.addEventListener('click', () => {
    if (activeSessionCleanup) return;

    renderSessionSetupModal({
      topics: rawTopicsList,
      currentTopicId: activePositionTopicId,
      onStart: async (selectedTopicId, selectedTopicTitle) => {
        const { session, error: startErr } = await startStudySession({
          courseId,
          topicId: selectedTopicId,
        });

        if (startErr) {
          console.error('Failed to start study session:', startErr);
          return;
        }

        startSessionBtn.disabled = true;
        startSessionBtn.style.opacity = '0.5';

        activeSessionCleanup = renderActiveSessionBar({
          topicTitle: selectedTopicTitle,
          startTime: Date.now(),
          onFinish: ({ formattedTime }) => {
            activeSessionCleanup = null;
            startSessionBtn.disabled = false;
            startSessionBtn.style.opacity = '1';

            renderQuickUpdateModal({
              topicTitle: selectedTopicTitle,
              formattedDuration: formattedTime,
              onSave: async ({ topicStatus, notes }) => {
                const { nextTopicId, error: completeErr } =
                  await completeStudySession({
                    sessionId: session.id,
                    courseId,
                    topicId: selectedTopicId,
                    topicStatus,
                    notes,
                  });

                if (completeErr) return { error: completeErr };

                if (nextTopicId) {
                  activePositionTopicId = nextTopicId;
                }

                await loadAndRenderTree();
                return { error: null };
              },
            });
          },
          onCancel: () => {
            activeSessionCleanup = null;
            startSessionBtn.disabled = false;
            startSessionBtn.style.opacity = '1';
          },
        });
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
    }, 3000);
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

  async function loadAndRenderTree() {
    treeContainer.innerHTML = `
      <p style="color:#71717a;">
        جاري تحميل المواضيع...
      </p>
    `;

    const { topics, error } = await fetchTopicTree(courseId);

    if (error) {
      treeContainer.innerHTML = `
        <p style="color:#e05252;">
          فشل تحميل المواضيع: ${error.message}
        </p>
      `;
      return;
    }

    rawTopicsList = topics ?? [];

    if (!topics || topics.length === 0) {
      treeContainer.innerHTML = `
        <p style="color:#71717a;">
          لا يوجد Topics بعد لهذا المساق.
        </p>
      `;
      return;
    }

    if (!activePositionTopicId) {
      const firstIncomplete =
        topics.find((t) => t.status !== 'completed' && (!t.children || t.children.length === 0)) ||
        topics.find((t) => t.status !== 'completed') ||
        topics[0];

      if (firstIncomplete) {
        activePositionTopicId = firstIncomplete.id;
      }
    }

    const topicTree = buildTopicTree(topics);
    treeContainer.innerHTML = '';

    topicTree.forEach((topic) => {
      const node = renderTopicNode(
        topic,
        topic.children,
        {
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
        }
      );

      treeContainer.appendChild(node);
    });

    if (activePositionTopicId) {
      requestAnimationFrame(scrollToCurrentPosition);
    }
  }

  // التهيئة المبدئية للشجرة
  await loadAndRenderTree();

  return () => {
    if (activeSessionCleanup) activeSessionCleanup();
    formOpen = false;
    formContainer.innerHTML = '';
  };
}