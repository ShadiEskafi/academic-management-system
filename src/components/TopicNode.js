// src/components/TopicNode.js
// عنصر عقدة شجرة المواضيع الأكاديمية وفق الـ Design System (Phase D)
import { icons } from '../utils/icons.js';

export function renderTopicNode(
  topic,
  children = [],
  {
    onStatusChange,
    onAddChild,
    onEdit,
    onDelete,
    currentTopicId = null,
  }
) {
  const isParent = children.length > 0;
  const isCurrentTopic = topic.id === currentTopicId;

  const nodeWrapper = document.createElement('div');
  nodeWrapper.dataset.topicId = topic.id;
  nodeWrapper.style.width = '100%';
  nodeWrapper.style.boxSizing = 'border-box';

  if (isCurrentTopic) {
    nodeWrapper.dataset.currentPosition = 'true';
    nodeWrapper.setAttribute('aria-current', 'location');
    nodeWrapper.setAttribute('tabindex', '-1');
  }

  function containsCurrentTopic(node) {
    if (!currentTopicId) return false;
    if (node.id === currentTopicId) return true;
    return (node.children ?? []).some((child) => containsCurrentTopic(child));
  }

  const containsCurrent = containsCurrentTopic({ ...topic, children });

  // =========================================================
  // Node Row
  // =========================================================
  const nodeEl = document.createElement('div');
  nodeEl.className = 'topic-node-row' + (isCurrentTopic ? ' highlight-current-position' : '');
  nodeEl.style.display = 'flex';
  nodeEl.style.justifyContent = 'space-between';
  nodeEl.style.alignItems = 'center';
  nodeEl.style.gap = 'var(--space-3)';
  nodeEl.style.padding = 'var(--space-2) var(--space-3)';
  nodeEl.style.marginBottom = 'var(--space-1)';
  nodeEl.style.borderRadius = 'var(--radius-sm)';
  nodeEl.style.border = isCurrentTopic
    ? '1px solid var(--color-accent-border)'
    : '1px solid var(--color-border)';
  nodeEl.style.background = isCurrentTopic
    ? 'var(--color-accent-soft)'
    : isParent
    ? 'var(--color-surface-soft)'
    : 'var(--color-surface)';
  nodeEl.style.boxSizing = 'border-box';
  nodeEl.style.transition = 'background var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard)';

  // =========================================================
  // Title & Affordance
  // =========================================================
  const titleContainer = document.createElement('div');
  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  titleContainer.style.gap = 'var(--space-2)';
  titleContainer.style.minWidth = '0';
  titleContainer.style.flex = '1';

  let toggleBtn = null;
  const initiallyExpanded = !currentTopicId || containsCurrent;

  if (isParent) {
    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn-icon';
    toggleBtn.style.width = '26px';
    toggleBtn.style.height = '26px';
    toggleBtn.style.border = 'none';
    toggleBtn.style.background = 'transparent';
    toggleBtn.style.padding = '0';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.innerHTML = initiallyExpanded ? icons.chevronDown(14) : icons.chevronLeft(14);
    toggleBtn.setAttribute('aria-expanded', String(initiallyExpanded));
    toggleBtn.setAttribute('aria-label', initiallyExpanded ? 'طي المواضيع الفرعية' : 'توسيع المواضيع الفرعية');
    titleContainer.appendChild(toggleBtn);
  } else {
    const spacer = document.createElement('span');
    spacer.style.width = '26px';
    spacer.style.flexShrink = '0';
    titleContainer.appendChild(spacer);
  }

  const titleEl = document.createElement('span');
  titleEl.textContent = topic.title;
  titleEl.style.fontSize = '14px';
  titleEl.style.fontWeight = isParent || isCurrentTopic ? '600' : '400';
  titleEl.style.color = isCurrentTopic ? 'var(--color-accent)' : 'var(--color-text)';
  titleEl.style.overflow = 'hidden';
  titleEl.style.textOverflow = 'ellipsis';
  titleEl.style.whiteSpace = 'nowrap';
  titleContainer.appendChild(titleEl);

  if (isCurrentTopic) {
    const currentBadge = document.createElement('span');
    currentBadge.className = 'badge badge-accent';
    currentBadge.textContent = 'الموضع الحالي';
    currentBadge.style.fontSize = '11px';
    currentBadge.style.flexShrink = '0';
    titleContainer.appendChild(currentBadge);
  }

  if (isParent) {
    const countBadge = document.createElement('span');
    countBadge.className = 'badge font-en';
    countBadge.textContent = children.length;
    countBadge.style.fontSize = '11px';
    countBadge.style.flexShrink = '0';
    titleContainer.appendChild(countBadge);
  }

  nodeEl.appendChild(titleContainer);

  // =========================================================
  // Controls Area
  // =========================================================
  const controlContainer = document.createElement('div');
  controlContainer.style.display = 'flex';
  controlContainer.style.alignItems = 'center';
  controlContainer.style.gap = 'var(--space-2)';
  controlContainer.style.flexShrink = '0';

  if (isParent) {
    const badge = document.createElement('span');
    badge.className = getTopicStatusBadgeClass(topic.status);
    badge.textContent = getTopicStatusLabel(topic.status);
    controlContainer.appendChild(badge);
  } else {
    const select = document.createElement('select');
    select.className = 'input';
    select.style.minHeight = '32px';
    select.style.padding = '0 var(--space-2)';
    select.style.fontSize = '12px';
    select.style.width = 'auto';

    const statuses = [
      { key: 'not_started', label: 'لم يبدأ' },
      { key: 'in_progress', label: 'قيد الدراسة' },
      { key: 'completed', label: 'مكتمل' },
      { key: 'needs_review', label: 'بحاجة مراجعة' },
    ];

    statuses.forEach((st) => {
      const opt = document.createElement('option');
      opt.value = st.key;
      opt.textContent = st.label;
      if (st.key === topic.status) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
      const selectedValue = e.target.value;
      select.disabled = true;
      try {
        await onStatusChange(topic.id, selectedValue);
      } finally {
        select.disabled = false;
      }
    });

    controlContainer.appendChild(select);
  }

  // إضافة موضوع فرعي
  const addChildBtn = document.createElement('button');
  addChildBtn.type = 'button';
  addChildBtn.className = 'btn-tertiary';
  addChildBtn.style.minHeight = '30px';
  addChildBtn.style.fontSize = '12px';
  addChildBtn.innerHTML = `${icons.plus(13)} <span>فرعي</span>`;
  addChildBtn.addEventListener('click', () => onAddChild(topic));
  controlContainer.appendChild(addChildBtn);

  // تعديل
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-icon';
  editBtn.style.width = '30px';
  editBtn.style.height = '30px';
  editBtn.title = 'تعديل اسم الموضوع';
  editBtn.setAttribute('aria-label', 'تعديل اسم الموضوع');
  editBtn.innerHTML = icons.edit(14);
  editBtn.addEventListener('click', () => onEdit && onEdit(topic));
  controlContainer.appendChild(editBtn);

  // حذف
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-icon';
  deleteBtn.style.width = '30px';
  deleteBtn.style.height = '30px';
  deleteBtn.style.color = 'var(--color-danger)';
  deleteBtn.title = 'حذف الموضوع';
  deleteBtn.setAttribute('aria-label', 'حذف الموضوع');
  deleteBtn.innerHTML = icons.trash(14);
  deleteBtn.addEventListener('click', () => onDelete && onDelete(topic, isParent, children.length));
  controlContainer.appendChild(deleteBtn);

  nodeEl.appendChild(controlContainer);
  nodeWrapper.appendChild(nodeEl);

  // =========================================================
  // Children Container (مع خط ربط logical RTL)
  // =========================================================
  if (isParent) {
    const childrenContainer = document.createElement('div');
    childrenContainer.style.marginInlineStart = 'var(--space-4)';
    childrenContainer.style.paddingInlineStart = 'var(--space-3)';
    childrenContainer.style.borderInlineStart = '2px solid var(--color-border)';
    childrenContainer.style.marginBottom = 'var(--space-2)';
    childrenContainer.hidden = !initiallyExpanded;

    children.forEach((child) => {
      const childNode = renderTopicNode(child, child.children ?? [], {
        onStatusChange,
        onAddChild,
        onEdit,
        onDelete,
        currentTopicId,
      });
      childrenContainer.appendChild(childNode);
    });

    nodeWrapper.appendChild(childrenContainer);

    let expanded = initiallyExpanded;
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      childrenContainer.hidden = !expanded;
      toggleBtn.innerHTML = expanded ? icons.chevronDown(14) : icons.chevronLeft(14);
      toggleBtn.setAttribute('aria-expanded', String(expanded));
      toggleBtn.setAttribute('aria-label', expanded ? 'طي المواضيع الفرعية' : 'توسيع المواضيع الفرعية');
    });
  }

  return nodeWrapper;
}

function getTopicStatusBadgeClass(status) {
  switch (status) {
    case 'completed':
      return 'badge badge-success';
    case 'in_progress':
      return 'badge badge-accent';
    case 'needs_review':
      return 'badge badge-warning';
    default:
      return 'badge';
  }
}

function getTopicStatusLabel(status) {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'in_progress':
      return 'قيد الدراسة';
    case 'needs_review':
      return 'بحاجة مراجعة';
    case 'not_started':
    default:
      return 'لم يبدأ';
  }
}