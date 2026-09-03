// src/pages/CourseDetailPage.js
// صفحة محتوى المساق — تعرض Topics كشجرة هرمية

import { fetchTopicTree, updateTopicStatus } from '../api/topics.js';
import { renderTopicNode } from '../components/TopicNode.js';

export async function renderCourseDetailPage(
  container,
  { courseId, courseTitle, onBack }
) {
  container.innerHTML = `
    <div style="margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
      <button
        id="back-to-courses-btn"
        style="padding:0.4rem 0.8rem;cursor:pointer;"
      >
        ← العودة للمساقات
      </button>

      <h2>Course Content — ${courseTitle ?? 'Course'}</h2>
    </div>

    <div
      id="tree-container"
      style="display:flex;flex-direction:column;gap:0.25rem;"
    >
      جاري التحميل...
    </div>
  `;

  const backButton = container.querySelector('#back-to-courses-btn');
  const treeContainer = container.querySelector('#tree-container');

  backButton.addEventListener('click', () => onBack());

  async function loadAndRenderTree() {
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

    treeContainer.innerHTML = '';

    topics.forEach((topic) => {
      const node = renderTopicNode(topic, topics, {
        onStatusChange: async (topicId, newStatus) => {
          const { error: updateError } = await updateTopicStatus(
            topicId,
            newStatus
          );

          if (updateError) {
            alert('فشل تحديث الحالة: ' + updateError.message);
            return;
          }

          // إعادة جلب الشجرة كاملة لتعكس الحالة المشتقة من الـ DB Trigger
          await loadAndRenderTree();
        },
      });

      treeContainer.appendChild(node);
    });
  }

  await loadAndRenderTree();

  // لا يوجد اشتراك دائم في هذه الصفحة حاليًا
  // لذلك Cleanup بسيط يكفي
  return () => {};
}