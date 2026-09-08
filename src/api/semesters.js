// src/api/semesters.js
// UC-04 (Manage Semester) — Client-Side مباشر حسب Phase 05 (جدول واحد، CRUD بسيط).
// فقط بيتكلم مع Supabase، بدون أي لمسة للـ DOM أو الـ state.

import { supabase } from './supabaseClient.js';

export async function fetchSemesters() {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .order('created_at', { ascending: false });

  return { semesters: data ?? [], error };
}

export async function fetchSemesterById(semesterId) {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('id', semesterId)
    .single();

  return { semester: data ?? null, error };
}

export async function createSemester({ title, status = 'planned', startDate = null, endDate = null }) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: userId,
      title,
      status,
      start_date: startDate,
      end_date: endDate,
    })
    .select()
    .single();

  return { semester: data ?? null, error };
}

export async function updateSemester(semesterId, updates) {
  const payload = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('semesters')
    .update(payload)
    .eq('id', semesterId)
    .select()
    .single();

  return { semester: data ?? null, error };
}

export async function deleteSemester(semesterId) {
  const { error } = await supabase
    .from('semesters')
    .delete()
    .eq('id', semesterId);

  return { error };
}

/**
 * تعيين فصل دراسي محدد كـ "فصل حالي نشط" وتصفير بقية الفصول لـ false
 */
export async function setCurrentSemester(semesterId) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return { success: false, error: new Error('المستخدم غير مسجل الدخول') };
  }

  // 1. إعادة ضبط جميع فصول المستخدم إلى is_current = false
  const { error: resetErr } = await supabase
    .from('semesters')
    .update({ is_current: false })
    .eq('user_id', userId);

  if (resetErr) {
    console.error('Error resetting current semesters:', resetErr);
  }

  // 2. تعيين الفصل المختار كـ is_current = true
  const { data, error } = await supabase
    .from('semesters')
    .update({ is_current: true })
    .eq('id', semesterId)
    .select()
    .single();

  return { semester: data ?? null, success: !error, error };
}