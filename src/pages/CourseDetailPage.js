// src/pages/CourseDetailPage.js
import { fetchTopicTree, updateTopicStatus } from '../api/topics.js';
import { renderTopicNode } from '../components/TopicNode.js';

export async function renderCourseDetailPage(container, { courseId, onBack }) {
  container.innerHTML = `
    <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
      <button id="back-to-courses-btn" style="padding: 0.4rem 0.8rem; cursor: pointer;">← العودة للمساقات</button>
      <h2>محتوى المساق (Topic Tree)</h2>
    </div>
    <div id="tree-container" style="display: flex; flex-direction: column; gap: 0.25rem;">جاري التحميل...</div>
  `;

  container.querySelector('#back-to-courses-btn').addEventListener('click', onBack);
  const treeContainer = container.querySelector('#tree-container');

  async function loadAndRenderTree() {
    const { topics, error } = await fetchTopicTree(courseId);

    if (error) {
      treeContainer.innerHTML = `<p style="color:#e05252;">فشل تحميل المواضيع: ${error.message}</p>`;
      return;
    }

    if (!topics || topics.length === 0) {
      treeContainer.innerHTML = `<p style="color:#71717a;">لا يوجد Topics بعد لهذا المساق.</p>`;
      return;
    }

    treeContainer.innerHTML = '';
    topics.forEach((topic) => {
      const node = renderTopicNode(topic, topics, {
        onStatusChange: async (topicId, newStatus) => {
          const { error: updateErr } = await updateTopicStatus(topicId, newStatus);
          if (updateErr) {
            alert('فشل تحديث الحالة: ' + updateErr.message);
          } else {
            // إعادة جلب الشجرة كاملة لتعكس القرارات المشتقة من الـ DB Trigger
            await loadAndRenderTree();
          }
        },
      });
      treeContainer.appendChild(node);
    });
  }

  await loadAndRenderTree();

  // إرجاع دالة Cleanup فارغة للالتزام بنمط الصفحات الموحد
  return () => {};
}