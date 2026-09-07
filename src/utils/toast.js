// src/utils/toast.js
import { icons } from './icons.js';

let containerEl = null;

function getToastContainer() {
  if (!containerEl || !document.body.contains(containerEl)) {
    containerEl = document.createElement('div');
    containerEl.className = 'toast-container';
    containerEl.setAttribute('aria-live', 'polite');
    containerEl.setAttribute('aria-atomic', 'true');
    document.body.appendChild(containerEl);
  }
  return containerEl;
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const iconSvg =
    type === 'success'
      ? icons.check(18)
      : type === 'error' || type === 'warning'
      ? icons.alertTriangle(18)
      : icons.clock(18);

  toast.innerHTML = `
    <span class="toast-icon" style="display:inline-flex;align-items:center;flex-shrink:0;" aria-hidden="true">
      ${iconSvg}
    </span>
    <span style="flex:1;font-weight:500;font-size:13.5px;line-height:1.4;">${escapeHtml(message)}</span>
    <button type="button" class="toast-dismiss" aria-label="إغلاق">&times;</button>
  `;

  const dismissBtn = toast.querySelector('.toast-dismiss');
  let timer = null;

  function removeToast() {
    clearTimeout(timer);
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 240);
  }

  dismissBtn.addEventListener('click', removeToast);
  timer = setTimeout(removeToast, duration);

  container.appendChild(toast);

  // إجبار المتصفح على تشغيل الـ Transition عبر requestAnimationFrame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}