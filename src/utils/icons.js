// src/utils/icons.js
// نظام أيقونات خطي موحد (Clean Outline SVGs) بديل كامل للإيموجي
// متناسق مع حجم النصوص وتدرجات الألوان عبر currentColor

function createSvg(content, size = 18, className = '') {
  return `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="${size}" 
      height="${size}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="1.8" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      class="system-icon ${className}"
      aria-hidden="true"
      style="vertical-align: middle; flex-shrink: 0;"
    >
      ${content}
    </svg>
  `.trim();
}

export const icons = {
  // ترويسة ولوجو الأكاديمية
  academicCap: (size = 18) =>
    createSvg(
      `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>`,
      size
    ),

  // الفصول الدراسية والمواد
  book: (size = 18) =>
    createSvg(
      `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
      size
    ),

  // أوقات التفرغ والتوقيت
  clock: (size = 18) =>
    createSvg(
      `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
      size
    ),

  calendar: (size = 18) =>
    createSvg(
      `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
      size
    ),

  // العمليات والإجراءات
  plus: (size = 16) =>
    createSvg(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`, size),

  edit: (size = 16) =>
    createSvg(
      `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
      size
    ),

  trash: (size = 16) =>
    createSvg(
      `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>`,
      size
    ),

  arrowLeft: (size = 16) =>
    createSvg(`<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`, size),

  arrowRight: (size = 16) =>
    createSvg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, size),

  chevronDown: (size = 14) =>
    createSvg(`<polyline points="6 9 12 15 18 9"/>`, size),

  chevronLeft: (size = 14) =>
    createSvg(`<polyline points="15 18 9 12 15 6"/>`, size),

  check: (size = 16) =>
    createSvg(`<polyline points="20 6 9 17 4 12"/>`, size),

  alertTriangle: (size = 18) =>
    createSvg(
      `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
      size
    ),

  // الجلسات وشجرة المواضيع
  play: (size = 16) =>
    createSvg(`<polygon points="5 3 19 12 5 21 5 3"/>`, size),

  folderTree: (size = 18) =>
    createSvg(
      `<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/><circle cx="12" cy="13" r="2"/><path d="M12 15v5"/>`,
      size
    ),

  // أيقونات لوحة التحكم والإحصائيات
  layoutDashboard: (size = 18) =>
    createSvg(
      `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>`,
      size
    ),

  trendingUp: (size = 18) =>
    createSvg(
      `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
      size
    ),

  target: (size = 18) =>
    createSvg(
      `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
      size
    ),

  award: (size = 18) =>
    createSvg(
      `<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>`,
      size
    ),

  fileText: (size = 18) =>
    createSvg(
      `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>`,
      size
    ),

  barChart: (size = 18) =>
    createSvg(
      `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
      size
    ),

  zap: (size = 18) =>
    createSvg(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`, size),

  google: (size = 18) => `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      class="system-icon"
      aria-hidden="true"
      style="vertical-align: middle; flex-shrink: 0;"
    >
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  `.trim(),

  // ثيمات المظهر
  sun: (size = 18) =>
    createSvg(
      `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`,
      size
    ),

  moon: (size = 18) =>
    createSvg(
      `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
      size
    ),
};


