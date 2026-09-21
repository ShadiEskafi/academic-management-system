// src/pages/AuthPage.js
// إعادة توجيه متوافقة لشاشة تسجيل الدخول المخصصة للبيتا المغلقة
import { renderLoginPage } from './LoginPage.js';

export function renderAuthPage(container) {
  return renderLoginPage(container);
}

export { renderLoginPage };