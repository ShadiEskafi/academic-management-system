// src/utils/sanitize.js
// دالة مركزية لتطهير النصوص ومنع ثغرات XSS عند استخدام innerHTML

/**
 * تطهير النصوص من أحرف HTML الخطرة لمنع حقن XSS.
 * يجب استخدامها دائماً عند إدراج بيانات المستخدم أو قاعدة البيانات داخل innerHTML.
 *
 * @param {*} str - النص المراد تطهيره
 * @returns {string} النص المُطهَّر الآمن للإدراج في HTML
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
