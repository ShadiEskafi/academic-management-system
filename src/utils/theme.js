// src/utils/theme.js
// إدارة المظهر (الوضع الفاتح والداكن) وتخزين التفضيل

export function getTheme() {
  const domTheme = document.documentElement.getAttribute('data-theme');
  if (domTheme) return domTheme;

  const saved = localStorage.getItem('theme');
  if (saved) return saved;

  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function setTheme(theme) {
  const validTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', validTheme);
  localStorage.setItem('theme', validTheme);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: validTheme } }));
  return validTheme;
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  return setTheme(next);
}

