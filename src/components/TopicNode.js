// src/components/TopicNode.js
// رسم عناصر الشجرة — تمييز بصري بين الـ Parent (غير قابل للتعديل) والـ Leaf (قابل للتعديل)

export function renderTopicNode(topic, allTopics, { onStatusChange }) {
  // فحص هل الـ Topic الحالي يعتبر Parent (له أبناء) أم Leaf
  const isParent = allTopics.some((t) => t.parent_id === topic.id);
  const indentPx = (topic.depth ?? 0) * 24;

  const nodeEl = document.createElement('div');
  nodeEl.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    margin-left: ${indentPx}px;
    margin-bottom: 0.35rem;
    background: ${isParent ? '#f4f4f5' : '#ffffff'};
    border: 1px solid #e4e4e7;
    border-radius: 4px;
    border-right: ${isParent ? '4px solid #3b82f6' : '1px solid #e4e4e7'};
  `;

  const titleEl = document.createElement('span');
  titleEl.textContent = topic.title;
  titleEl.style.fontWeight = isParent ? '600' : '400';
  nodeEl.appendChild(titleEl);

  const controlContainer = document.createElement('div');

  if (isParent) {
    // Parent: شارة مشتقة غير قابلة للتعديل مباشرة (يحسبها الـ DB Trigger)
    const badge = document.createElement('span');
    badge.textContent = topic.status;
    badge.style.cssText = `
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #475569;
    `;
    controlContainer.appendChild(badge);
  } else {
    // Leaf: قائمة لاختيار الحالة
    const select = document.createElement('select');
    select.style.cssText = 'padding: 2px 6px; font-size: 13px; border-radius: 4px;';
    
    const statuses = ['not_started', 'in_progress', 'completed', 'needs_review'];
    statuses.forEach((st) => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      if (st === topic.status) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
      select.disabled = true;
      await onStatusChange(topic.id, e.target.value);
      select.disabled = false;
    });

    controlContainer.appendChild(select);
  }

  nodeEl.appendChild(controlContainer);
  return nodeEl;
}