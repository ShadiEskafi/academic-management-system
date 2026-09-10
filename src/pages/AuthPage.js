// src/pages/AuthPage.js
// الطبقة اللي بتربط: api (auth.js) ↔ components (AuthForm.js)
// ملاحظة: بعد نجاح signIn/signUp، الانتقال لداخل التطبيق صار مسؤولية
// المستمع العام onAuthStateChange بـ main.js (مش هذا الملف) — هو اللي
// بيحدّث الـ store ويقرر الانتقال، فور ما Supabase يأكّد الجلسة فعليًا.

import { signIn, signUp, signInWithGoogle } from '../api/auth.js';
import { renderAuthForm } from '../components/AuthForm.js';

export function renderAuthPage(container) {
  renderAuthForm(container, {
    onSubmit: async ({ mode, email, password }) => {
      const result = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password);

      // ما منستدعي setCurrentUser ولا أي انتقال يدوي هون —
      // onAuthStateChange بـ main.js رح يلتقط الجلسة الجديدة تلقائيًا
      // ويتولى الانتقال، بمجرد ما Supabase يأكدها فعليًا.
      return { error: result.error ?? null };
    },
    onGoogleSignIn: async () => {
      await signInWithGoogle();
    },
  });
}