// src/pages/CourseDetailPage.js
// شاشة تفاصيل المساق وفق الـ Design System (Topic Tree & Assessments)
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
  let activeSessionCleanup = null;
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

      <header style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap;">
        <div>
          <h1 style="margin:0 0 var(--space-1);">إدارة محتوى المساق</h1>
          <p class="text-secondary" style="font-size:14px;">تنظيم شجرة المواضيع، متابعة الاستحقاقات، وجلسات المذاكرة المركزة.</p>
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

  const addRootBtn = container.querySelector('#add-root-topic-btn');
  const formContainer = container.querySelector('#topic-form-container');
  const treeContainer = container.querySelector('#tree-container');

  let formOpen = false;

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
      renderAssessmentsView(assessmentsViewSection, { courseId });
      assessmentsMounted = true;
    }
  });

  backBtn.addEventListener('click', () => {
    if (activeSessionCleanup) activeSessionCleanup();
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

        activeSessionCleanup = renderActiveSessionBar({
          topicTitle: selectedTopicTitle,
          startTime: Date.now(),
          onFinish: ({ formattedTime }) => {
            activeSessionCleanup = null;
            startSessionBtn.disabled = false;

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

  async function loadAndRenderTree() {
    treeContainer.innerHTML = skeletons.tree(4);

    const { topics, error } = await fetchTopicTree(courseId);

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

    rawTopicsList = topics ?? [];

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

  await loadAndRenderTree();

  return () => {
    if (activeSessionCleanup) activeSessionCleanup();
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