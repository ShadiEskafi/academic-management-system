// src/api/courses.js
// UC-05 (Manage Course) — Client-Side مباشر حسب Phase 05.
// فقط بيتكلم مع Supabase، بدون أي لمسة للـ DOM أو الـ state.

import { supabase } from './supabaseClient.js';

export async function fetchCoursesBySemester(semesterId) {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: false });

  if (error) return { courses: [], error };

  // نجيب عناوين الـ Topics يلي current_position_topic_id بتشاور عليها،
  // عشان نعرض "آخر موضع: X" بدل ما نعرض بس الـ id (استعلام واحد إضافي، مش N+1).
  const positionIds = (courses ?? [])
    .map((c) => c.current_position_topic_id)
    .filter(Boolean);

  let positionTitles = {};
  if (positionIds.length > 0) {
    const { data: topics } = await supabase
      .from('topics')
      .select('id, title')
      .in('id', positionIds);

    positionTitles = Object.fromEntries(
      (topics ?? []).map((t) => [t.id, t.title])
    );
  }

  const enriched = (courses ?? []).map((c) => ({
    ...c,
    currentPositionTitle: c.current_position_topic_id
      ? positionTitles[c.current_position_topic_id] ?? null
      : null,
  }));

  return { courses: enriched, error: null };
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

export async function fetchCourseById(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*, semesters(id, title)')
    .eq('id', courseId)
    .single();

  return { course: data ?? null, error };
}