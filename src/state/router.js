// src/state/router.js
// راوتر حقيقي (Declarative Route Table) — بدل سلسلة if/else مباشرة على الـ hash.
//
// الاستخدام:
//   registerRoute('/semesters/:semesterId/courses', async ({ params, query, isCurrentRequest }) => {
//     ... يرسم الصفحة، ويرجع دالة cleanup (أو undefined)
//   });
//   configureRouter({ getContainer: () => contentContainer });
//   startRouter();   // يبدأ الاستماع لـ hashchange + يشغّل المسار الحالي فورًا
//   navigate('/semesters/123/courses');

const routes = [];
let notFoundHandler = null;
let containerProvider = null; // Guard صريح: بدون Container جاهز، ما في تشغيل لأي Route
let isListening = false;
let currentRequestId = 0;
let currentCleanup = null;

function compilePath(path) {
  const paramNames = [];
  const regexStr = path.replace(/\/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '/([^/]+)';
  });
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

/** يسجّل Route جديد بشكل تصريحي — أنماط زي '/semesters/:semesterId/courses' */
export function registerRoute(path, handler) {
  const { regex, paramNames } = compilePath(path);
  routes.push({ regex, paramNames, handler, path });
}

/** Route احتياطي لو ما في أي مطابقة (404 داخلي) */
export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

/**
 * Guard صريح — الراوتر ما بيشغّل أي Route بدون Container جاهز (مثلاً قبل
 * ما يخلص تسجيل الدخول ويتبنى الـ AppShell). بدل الاعتماد الضمني على
 * متغيّر خارجي، الراوتر بيطلب الـ Container صراحة بكل مرة عبر هالدالة.
 */
export function configureRouter({ getContainer }) {
  containerProvider = getContainer;
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/semesters';
  const [pathPart, queryPart] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
  return { path: pathPart, query };
}

/** الانتقال لمسار جديد — نقطة الدخول الوحيدة، بدل window.location.hash يدوي بكذا مكان */
export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return parseHash().path;
}

async function handleRouteChange() {
  const container = containerProvider?.();
  if (!container) return; // Guard: بدون Container جاهز، ما منكمل

  const requestId = ++currentRequestId;
  const isCurrentRequest = () => requestId === currentRequestId;

  const { path, query } = parseHash();

  let matched = null;
  let params = {};

  for (const route of routes) {
    const m = path.match(route.regex);
    if (m) {
      matched = route;
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(m[i + 1]);
      });
      break;
    }
  }

  // تنظيف الصفحة السابقة قبل رسم أي شي جديد — نفس مبدأ Subscription Cleanup
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const handler = matched?.handler ?? notFoundHandler;
  if (!handler) return;

  const cleanup = await handler({ params, query, container, isCurrentRequest });

  // فحص الـ Race Condition: لو تنقّلنا لمكان تاني أثناء ما كان الـ handler
  // شغّال (fetch بطيء مثلاً)، نتجاهل نتيجته وننضّف أي اشتراك فتحه
  if (!isCurrentRequest()) {
    if (cleanup) cleanup();
    return;
  }

  currentCleanup = typeof cleanup === 'function' ? cleanup : null;
}

/** يبدأ الاستماع للتنقل، ويشغّل المسار الحالي فورًا */
export function startRouter() {
  if (isListening) return;
  isListening = true;
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

/** يوقف الاستماع وينظّف الصفحة الحالية — يُستدعى عند تسجيل الخروج */
export function stopRouter() {
  if (!isListening) return;
  isListening = false;
  window.removeEventListener('hashchange', handleRouteChange);
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
}