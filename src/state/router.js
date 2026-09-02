// src/state/router.js
// راوتر بسيط جدًا مبني على window.location.hash — بدون أي مكتبة خارجية.
// الهدف: أي "صفحة" المستخدم فيها تنعكس بالـ URL، عشان Refresh ما يرجّعه
// دايمًا لنقطة البداية (المشكلة يلي واجهناها بدون هذا الملف).
//
// أنماط الروابط المدعومة حاليًا:
//   #/semesters
//   #/semesters/:semesterId/courses

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/semesters';
  const parts = hash.split('/').filter(Boolean); // ['semesters', ':id', 'courses']

  if (parts[0] === 'semesters' && parts[2] === 'courses' && parts[1]) {
    return { name: 'courses', semesterId: parts[1] };
  }
  return { name: 'semesters' };
}

export function navigate(path) {
  window.location.hash = path; // بيطلق hashchange تلقائيًا، ما محتاجين نستدعي أي شي إضافي
}

export function getCurrentRoute() {
  return parseHash();
}

export function onRouteChange(callback) {
  const handler = () => callback(parseHash());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}