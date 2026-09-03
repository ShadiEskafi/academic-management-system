// src/state/router.js
// راوتر بسيط جدًا مبني على window.location.hash — بدون أي مكتبة خارجية.
// الهدف: أي "صفحة" المستخدم فيها تنعكس بالـ URL، عشان Refresh ما يرجّعه
// دايمًا لنقطة البداية.
//
// أنماط الروابط المدعومة حاليًا:
//   #/semesters
//   #/semesters/:semesterId/courses
//   #/semesters/:semesterId/courses/:courseId

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/semesters';
  const parts = hash.split('/').filter(Boolean);

  // Course Detail
  if (
    parts[0] === 'semesters' &&
    parts[2] === 'courses' &&
    parts[1] &&
    parts[3]
  ) {
    return {
      name: 'course-detail',
      semesterId: parts[1],
      courseId: parts[3],
    };
  }

  // Courses
  if (
    parts[0] === 'semesters' &&
    parts[2] === 'courses' &&
    parts[1]
  ) {
    return {
      name: 'courses',
      semesterId: parts[1],
    };
  }

  return {
    name: 'semesters',
  };
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return parseHash();
}

export function onRouteChange(callback) {
  const handler = () => callback(parseHash());

  window.addEventListener('hashchange', handler);

  return () => {
    window.removeEventListener('hashchange', handler);
  };
}