// src/api/auth.js
// عمليات Auth فقط — بيرجع بيانات أو Error، بدون أي لمسة للـ DOM أو الـ state.
// الـ caller (من src/pages/) هو المسؤول يحدّث الـ store بالنتيجة.

import { supabase } from './supabaseClient.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data?.user ?? null, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user ?? null, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}