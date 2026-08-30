// src/pages/AuthPage.js
// الطبقة اللي بتربط: api (auth.js) ↔ state (store.js) ↔ components (AuthForm.js)
// هون بس المكان المسموح فيه نستدعي دوال setXxx من الـ store.

import { signIn, signUp } from '../api/auth.js';
import { setCurrentUser } from '../state/store.js';
import { renderAuthForm } from '../components/AuthForm.js';

export function renderAuthPage(container, { onAuthSuccess }) {
  renderAuthForm(container, {
    onSubmit: async ({ mode, email, password }) => {
      const result = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.error) {
        return { error: result.error };
      }

      setCurrentUser(result.user);
      onAuthSuccess?.(result.user);
      return { error: null };
    },
  });
}