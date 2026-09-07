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
};

