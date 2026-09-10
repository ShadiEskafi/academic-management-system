// src/pages/LoginPage.js
// وحدة توافقية لصفحة تسجيل الدخول تربط مع AuthPage
import { renderAuthPage } from './AuthPage.js';

export function renderLoginPage(container) {
  return renderAuthPage(container);
}

export { renderAuthPage };

