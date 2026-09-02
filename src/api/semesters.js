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