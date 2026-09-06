// src/api/exams.js
// خدمات CRUD المستقلة للامتحانات والكويزات القصيرة (UC-22)

import { supabase } from './supabaseClient.js';

/**
 * جلب جميع الامتحانات والكويزات الخاصة بمساق محدد
 */
export async function fetchExams(courseId) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('course_id', courseId)
    .order('exam_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { exams: data || [], error };
}

/**
 * إنشاء امتحان أو كويز جديد
 */
export async function createExam({
  courseId,
  title,
  examType = 'midterm',
  examDate = null,
  weight = null,
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return {
      exam: null,
      error: userError || new Error('المستخدم غير مسجل الدخول.'),
    };
  }

  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return { exam: null, error: new Error('عنوان الامتحان مطلوب.') };
  }

  const { data, error } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      course_id: courseId,
      title: cleanTitle,
      exam_type: examType || 'midterm',
      exam_date: examDate || null,
      weight: weight !== null && weight !== '' ? Number(weight) : null,
    })
    .select()
    .single();

  return { exam: data || null, error };
}

/**
 * تحديث امتحان أو كويز
 */
export async function updateExam(examId, updates) {
  const payload = {};
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.exam_type !== undefined) payload.exam_type = updates.exam_type;
  if (updates.examType !== undefined) payload.exam_type = updates.examType;
  if (updates.exam_date !== undefined) payload.exam_date = updates.exam_date || null;
  if (updates.examDate !== undefined) payload.exam_date = updates.examDate || null;
  if (updates.weight !== undefined) {
    payload.weight = updates.weight !== null && updates.weight !== '' ? Number(updates.weight) : null;
  }

  const { data, error } = await supabase
    .from('exams')
    .update(payload)
    .eq('id', examId)
    .select()
    .single();

  return { exam: data || null, error };
}

/**
 * حذف امتحان أو كويز
 */
export async function deleteExam(examId) {
  const { data, error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId)
    .select()
    .single();

  return { exam: data || null, error };
}