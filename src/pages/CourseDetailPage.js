// src/pages/CourseDetailPage.js
// صفحة محتوى المساق — مسؤولة عن تنسيق Topic Tree وعمليات الإنشاء والحذف وتحديث الموضع الحالي.

import {
  fetchTopicTree,
  updateTopicStatus,
  completeTopicAndAdvance,
  createTopic,
  deleteTopic,
} from '../api/topics.js';

import { renderTopicNode } from '../components/TopicNode.js';
import { renderTopicForm } from '../components/TopicForm.js';

// =========================================================
// بناء Tree Structure من الـ Flat Array
// =========================================================

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

// =========================================================
// Render Course Detail Page
// =========================================================

export async function renderCourseDetailPage(
  container,
  { courseId, currentPositionTopicId = null, onBack }
) {
  let activePositionTopicId = currentPositionTopicId;

  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">

      <div
        style="
          display:flex;
          align-items:center;
          gap:1rem;
          margin-bottom:1rem;
        "
      >
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
          محتوى المساق (Topic Tree)
        </h2>
      </div>

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
  `;

  const backBtn = container.querySelector('#back-to-courses-btn');
  const addRootBtn = container.querySelector('#add-root-topic-btn');
  const formContainer = container.querySelector('#topic-form-container');
  const treeContainer = container.querySelector('#tree-container');

  let formOpen = false;

  backBtn.addEventListener('click', onBack);

  function closeTopicForm() {
    formOpen = false;
    formContainer.innerHTML = '';
  }

  function openTopicForm(parentTopic = null) {
    formOpen = true;
    formContainer.innerHTML = '';

    renderTopicForm(formContainer, {
      parentTopic,

      onCancel: () => {
        closeTopicForm();
      },

      onSave: async ({ title, parentId }) => {
        const { topic, error } = await createTopic({
          courseId,
          parentId,
          title,
        });

        if (error) {
          return { error };
        }

        closeTopicForm();

        // إذا لم يكن هناك موضع نشط، نسند أول موضوع مضاف
        if (!activePositionTopicId && topic) {
          activePositionTopicId = topic.id;
        }

        await loadAndRenderTree();

        return {
          topic,
          error: null,
        };
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

  // =========================================================
  // Scroll & Highlight إلى Current Position
  // =========================================================

  function scrollToCurrentPosition() {
    if (!activePositionTopicId) {
      return;
    }

    const currentNode = treeContainer.querySelector(
      `[data-topic-id="${CSS.escape(activePositionTopicId)}"]`
    );

    if (!currentNode) {
      return;
    }

    // فتح كافة الحاويات الأبوية المغلقة للوصول للعنصر
    let parentEl = currentNode.parentElement;
    while (parentEl && parentEl !== treeContainer) {
      if (parentEl.hidden) {
        parentEl.hidden = false;
      }
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

  // =========================================================
  // Load + Build + Render Tree
  // =========================================================

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

    if (!topics || topics.length === 0) {
      treeContainer.innerHTML = `
        <p style="color:#71717a;">
          لا يوجد Topics بعد لهذا المساق.
        </p>
      `;
      return;
    }

    // تهيئة الموضع النشط تلقائياً لأول موضوع غير مكتمل إذا لم يكن محدداً
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
              // استدعاء RPC الإنجاز حتى يتحدث مؤشر المساق بالـ DB ويتقدم للموضوع التالي
              const { nextTopicId, error: completeErr } =
                await completeTopicAndAdvance(courseId, topicId);

              if (completeErr) {
                alert('فشل تسجيل إنجاز الموضوع: ' + completeErr.message);
                return;
              }

              // نقل الموضع النشط للموضوع التالي فوراً
              activePositionTopicId = nextTopicId;
            } else {
              const { error: updateErr } = await updateTopicStatus(
                topicId,
                newStatus
              );

              if (updateErr) {
                alert('فشل تحديث الحالة: ' + updateErr.message);
                return;
              }
            }

            // إعادة جلب الشجرة لتعكس الحالات المحسوبة بالـ DB Trigger
            await loadAndRenderTree();
          },

          onAddChild: (parentTopic) => {
            openTopicForm(parentTopic);
          },

          onDelete: async (topicToDelete) => {
            const { error: deleteErr } = await deleteTopic(topicToDelete.id);

            if (deleteErr) {
              alert('فشل حذف الـ Topic: ' + deleteErr.message);
              return;
            }

            if (activePositionTopicId === topicToDelete.id) {
              activePositionTopicId = null;
            }

            await loadAndRenderTree();
          },
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
    formOpen = false;
    formContainer.innerHTML = '';
  };
}