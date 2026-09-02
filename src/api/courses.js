// src/api/courses.js
// UC-05 (Manage Course) — Client-Side مباشر حسب Phase 05.
// فقط بيتكلم مع Supabase، بدون أي لمسة للـ DOM أو الـ state.

import { supabase } from './supabaseClient.js';

export async function fetchCoursesBySemester(semesterId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: false });

  return { courses: data ?? [], error };
}

export async function createCourse({ semesterId, title, creditHours, difficulty, priority = 'medium' }) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: userId,
      semester_id: semesterId,
      title,
      credit_hours: creditHours,
      difficulty,
      priority,
    })
    .select()
    .single();

  return { course: data ?? null, error };
}