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

/**
 * تطهير مدخلات المستخدم من وسوم الحقن والبروتوكولات الخطرة وموجهات الأحداث
 *
 * @param {*} str - النص المدخل
 * @returns {string} النص المُطهَّر
 */
export function sanitizeInput(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * التحقق الصارم من صحة صيغة وطول البريد الإلكتروني
 *
 * @param {*} email - عنوان البريد الإلكتروني
 * @returns {boolean} هل البريد صالح ومعياري
 */
export function isValidEmail(email) {
  if (!email) return false;
  const str = String(email).trim();
  if (str.length === 0 || str.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(str);
}

