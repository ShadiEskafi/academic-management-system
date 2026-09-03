// src/components/TopicNode.js
// رسم عناصر الشجرة — تمييز بصري بين الـ Parent والـ Leaf.
// الـ Component لا يتعامل مباشرة مع الـ API.
// كل Node يحتوي على حاوية فعلية لأبنائه لضمان الحفاظ على الـ Hierarchy.

export function renderTopicNode(
  topic,
  children,
  {
    onStatusChange,
    onAddChild,
    onDelete,
  }
) {
  const isParent = children.length > 0;

  const nodeWrapper = document.createElement('div');

  nodeWrapper.style.cssText = `
    width: 100%;
    box-sizing: border-box;
  `;

  // =========================================================
  // Node Row
  // =========================================================

  const nodeEl = document.createElement('div');

  nodeEl.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.35rem;
    background: ${isParent ? '#f4f4f5' : '#ffffff'};
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    box-sizing: border-box;
  `;

  // =========================================================
  // Title Container
  // =========================================================

  const titleContainer = document.createElement('div');

  titleContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  `;

  // =========================================================
  // Toggle Button
  // =========================================================

  let toggleBtn = null;

  if (isParent) {
    toggleBtn = document.createElement('button');

    toggleBtn.type = 'button';
    toggleBtn.textContent = '▼';
    toggleBtn.setAttribute('aria-label', 'Collapse topic');

    toggleBtn.style.cssText = `
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      flex-shrink: 0;
    `;

    titleContainer.appendChild(toggleBtn);
  } else {
    // مساحة ثابتة حتى يبقى الـ Title بمحاذاة الـ Parents
    const spacer = document.createElement('span');

    spacer.style.cssText = `
      width: 24px;
      flex-shrink: 0;
    `;

    titleContainer.appendChild(spacer);
  }

  // =========================================================
  // Topic Title
  // =========================================================

  const titleEl = document.createElement('span');

  titleEl.textContent = topic.title;
  titleEl.style.cssText = `
    font-weight: ${isParent ? '600' : '400'};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  titleContainer.appendChild(titleEl);

  // =========================================================
  // Children Count
  // =========================================================

  if (isParent) {
    const countBadge = document.createElement('span');

    countBadge.textContent = `(${children.length})`;

    countBadge.style.cssText = `
      font-size: 12px;
      padding: 2px 7px;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #475569;
      flex-shrink: 0;
    `;

    titleContainer.appendChild(countBadge);
  }

  nodeEl.appendChild(titleContainer);

  // =========================================================
  // Controls Container
  // =========================================================

  const controlContainer = document.createElement('div');

  controlContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  `;

  // =========================================================
  // Status
  // =========================================================

  if (isParent) {
    // Parent: الحالة مشتقة من الـ DB Trigger
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
    // Leaf: الحالة قابلة للتعديل
    const select = document.createElement('select');

    select.style.cssText = `
      padding: 3px 6px;
      font-size: 13px;
      border-radius: 4px;
    `;

    const statuses = [
      'not_started',
      'in_progress',
      'completed',
      'needs_review',
    ];

    statuses.forEach((st) => {
      const opt = document.createElement('option');

      opt.value = st;
      opt.textContent = st;

      if (st === topic.status) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
      select.disabled = true;

      await onStatusChange(
        topic.id,
        e.target.value
      );

      select.disabled = false;
    });

    controlContainer.appendChild(select);
  }

  // =========================================================
  // Add Subtopic Button
  // =========================================================

  const addChildBtn = document.createElement('button');

  addChildBtn.type = 'button';
  addChildBtn.textContent = '+ Subtopic';

  addChildBtn.style.cssText = `
    padding: 3px 7px;
    font-size: 12px;
    cursor: pointer;
  `;

  addChildBtn.addEventListener('click', () => {
    onAddChild(topic);
  });

  controlContainer.appendChild(addChildBtn);

  // =========================================================
  // Delete Button
  // =========================================================

  const deleteBtn = document.createElement('button');

  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';

  deleteBtn.style.cssText = `
    padding: 3px 7px;
    font-size: 12px;
    cursor: pointer;
  `;

  deleteBtn.addEventListener('click', async () => {
    const message = isParent
      ? `هذا الـ Topic يحتوي على ${children.length} Subtopic(s).\nحذفه سيؤدي إلى حذف الشجرة التابعة له بالكامل.\n\nهل تريد المتابعة؟`
      : `هل أنت متأكد من حذف "${topic.title}"؟`;

    const confirmed = window.confirm(message);

    if (!confirmed) {
      return;
    }

    deleteBtn.disabled = true;

    await onDelete(topic);

    deleteBtn.disabled = false;
  });

  controlContainer.appendChild(deleteBtn);

  nodeEl.appendChild(controlContainer);

  nodeWrapper.appendChild(nodeEl);

  // =========================================================
  // Children Container
  // =========================================================

  if (isParent) {
    const childrenContainer = document.createElement('div');

    childrenContainer.style.cssText = `
      margin-right: 1.25rem;
      padding-right: 0.75rem;
      border-right: 2px solid #e2e8f0;
      margin-bottom: 0.35rem;
    `;

    // رسم الأبناء داخل Parent فعليًا
    children.forEach((child) => {
      const childNode = renderTopicNode(
        child,
        child.children ?? [],
        {
          onStatusChange,
          onAddChild,
          onDelete,
        }
      );

      childrenContainer.appendChild(childNode);
    });

    nodeWrapper.appendChild(childrenContainer);

    // =======================================================
    // Toggle Behaviour
    // =======================================================

    let expanded = true;

    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;

      childrenContainer.style.display =
        expanded ? 'block' : 'none';

      toggleBtn.textContent =
        expanded ? '▼' : '▶';

      toggleBtn.setAttribute(
        'aria-label',
        expanded ? 'Collapse topic' : 'Expand topic'
      );
    });
  }

  return nodeWrapper;
}