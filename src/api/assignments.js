// src/api/assignments.js
// خدمات CRUD المستقلة للواجبات والتكليفات المنزلية والمشاريع (UC-21)

import { supabase } from './supabaseClient.js';

/**
 * جلب جميع الواجبات والتكليفات الخاصة بمساق محدد
 */
export async function fetchAssignments(courseId) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { assignments: data || [], error };
}

/**
 * إنشاء واجب جديد
 */
export async function createAssignment({
  courseId,
  title,
  type = 'assignment',
  dueDate = null,
  estimatedMinutes = null,
  priority = 'medium',
  status = 'pending',
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return {
      assignment: null,
      error: userError || new Error('المستخدم غير مسجل الدخول.'),
    };
  }

  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    return { assignment: null, error: new Error('عنوان الواجب مطلوب.') };
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      user_id: userId,
      course_id: courseId,
      title: cleanTitle,
      type: type || 'assignment',
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      priority: priority || 'medium',
      status: status || 'pending',
    })
    .select()
    .single();

  return { assignment: data || null, error };
}

/**
 * تحديث بيانات أو حالة واجب
 */
export async function updateAssignment(assignmentId, updates) {
  const payload = {};
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.due_date !== undefined) payload.due_date = updates.due_date || null;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
  if (updates.estimated_minutes !== undefined) {
    payload.estimated_minutes = updates.estimated_minutes ? Number(updates.estimated_minutes) : null;
  }
  if (updates.estimatedMinutes !== undefined) {
    payload.estimated_minutes = updates.estimatedMinutes ? Number(updates.estimatedMinutes) : null;
  }
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from('assignments')
    .update(payload)
    .eq('id', assignmentId)
    .select()
    .single();

  return { assignment: data || null, error };
}

/**
 * حذف واجب
 */
export async function deleteAssignment(assignmentId) {
  const { data, error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .select()
    .single();

  return { assignment: data || null, error };
}