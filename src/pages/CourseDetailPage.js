// src/pages/CourseDetailPage.js
// صفحة محتوى المساق — مسؤولة عن تنسيق Topic Tree وعمليات الإنشاء والحذف.
// يتم تحويل الـ Flat Array القادمة من الـ RPC إلى Tree Structure قبل الرسم.

import {
  fetchTopicTree,
  updateTopicStatus,
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

  // إنشاء نسخة من كل Topic وإضافة children
  topics.forEach((topic) => {
    topicMap.set(topic.id, {
      ...topic,
      children: [],
    });
  });

  // ربط كل Topic مع الـ Parent الخاص به
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

  // ترتيب الـ Roots حسب order
  rootTopics.sort((a, b) => {
    return Number(a.order) - Number(b.order);
  });

  // ترتيب الأبناء recursively حسب order
  function sortChildren(topic) {
    topic.children.sort((a, b) => {
      return Number(a.order) - Number(b.order);
    });

    topic.children.forEach((child) => {
      sortChildren(child);
    });
  }

  rootTopics.forEach((topic) => {
    sortChildren(topic);
  });

  return rootTopics;
}

// =========================================================
// Render Course Detail Page
// =========================================================

export async function renderCourseDetailPage(
  container,
  { courseId, onBack }
) {
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

  const backBtn = container.querySelector(
    '#back-to-courses-btn'
  );

  const addRootBtn = container.querySelector(
    '#add-root-topic-btn'
  );

  const formContainer = container.querySelector(
    '#topic-form-container'
  );

  const treeContainer = container.querySelector(
    '#tree-container'
  );

  let formOpen = false;

  // =========================================================
  // Back
  // =========================================================

  backBtn.addEventListener('click', onBack);

  // =========================================================
  // Close Topic Form
  // =========================================================

  function closeTopicForm() {
    formOpen = false;
    formContainer.innerHTML = '';
  }

  // =========================================================
  // Open Topic Form
  // =========================================================

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

        // إعادة جلب الشجرة من الـ Backend
        // لأن الـ DB هي مصدر القيم المشتقة.
        await loadAndRenderTree();

        return {
          topic,
          error: null,
        };
      },
    });
  }

  // =========================================================
  // Add Root Topic
  // =========================================================

  addRootBtn.addEventListener('click', () => {
    if (formOpen) {
      closeTopicForm();
      return;
    }

    openTopicForm();
  });

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

    // =======================================================
    // تحويل الـ Flat Array إلى Tree
    // =======================================================

    const topicTree = buildTopicTree(topics);

    treeContainer.innerHTML = '';

    // =======================================================
    // رسم الـ Root Topics فقط
    // =======================================================

    topicTree.forEach((topic) => {
      const node = renderTopicNode(
        topic,
        topic.children,
        {
          onStatusChange: async (
            topicId,
            newStatus
          ) => {
            const {
              error: updateErr,
            } = await updateTopicStatus(
              topicId,
              newStatus
            );

            if (updateErr) {
              alert(
                'فشل تحديث الحالة: ' +
                updateErr.message
              );

              return;
            }

            // إعادة جلب الشجرة لتعكس الحالة
            // المشتقة من الـ DB Trigger.
            await loadAndRenderTree();
          },

          onAddChild: (parentTopic) => {
            openTopicForm(parentTopic);
          },

          onDelete: async (topicToDelete) => {
            const {
              error: deleteErr,
            } = await deleteTopic(
              topicToDelete.id
            );

            if (deleteErr) {
              alert(
                'فشل حذف الـ Topic: ' +
                deleteErr.message
              );

              return;
            }

            // إعادة الجلب حتى يظهر تأثير
            // ON DELETE CASCADE والحالات المشتقة.
            await loadAndRenderTree();
          },
        }
      );

      treeContainer.appendChild(node);
    });
  }

  // =========================================================
  // Initial Load
  // =========================================================

  await loadAndRenderTree();

  // =========================================================
  // Cleanup
  // =========================================================

  return () => {
    formOpen = false;
    formContainer.innerHTML = '';
  };
}