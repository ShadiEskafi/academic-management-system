// src/api/topics.js
// إدارة Topics — جلب الشجرة، تحديث الحالة، إنشاء وحذف Topics.

import { supabase } from './supabaseClient.js';

export async function fetchTopicTree(courseId) {
  const { data, error } = await supabase.rpc('get_course_topic_tree', {
    p_course_id: courseId,
  });

  return { topics: data ?? [], error };
}

export async function updateTopicStatus(topicId, status) {
  const { data, error } = await supabase
    .from('topics')
    .update({ status })
    .eq('id', topicId)
    .select()
    .single();

  return { topic: data ?? null, error };
}

export async function createTopic({ courseId, parentId = null, title }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return {
      topic: null,
      error: userError ?? new Error('المستخدم غير مسجل الدخول.'),
    };
  }

  const cleanTitle = String(title ?? '').trim();

  if (!cleanTitle) {
    return {
      topic: null,
      error: new Error('عنوان الـ Topic مطلوب.'),
    };
  }

  // التأكد أن الـ Course تابع للمستخدم الحالي
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('user_id', userId)
    .single();

  if (courseError || !course) {
    return {
      topic: null,
      error: courseError ?? new Error('المساق غير موجود أو غير متاح.'),
    };
  }

  // إذا كان Topic فرعيًا، نتأكد أن الـ Parent:
  // 1. تابع لنفس المستخدم
  // 2. تابع لنفس الـ Course
  let parent = null;

  if (parentId) {
    const { data: parentData, error: parentError } = await supabase
      .from('topics')
      .select('id, course_id, parent_id')
      .eq('id', parentId)
      .eq('user_id', userId)
      .single();

    if (parentError || !parentData) {
      return {
        topic: null,
        error: parentError ?? new Error('الـ Parent Topic غير موجود.'),
      };
    }

    if (parentData.course_id !== courseId) {
      return {
        topic: null,
        error: new Error('لا يمكن إضافة Topic تحت Parent من مساق آخر.'),
      };
    }

    parent = parentData;
  }

  // جلب آخر Order لنفس الـ Siblings
  let orderQuery = supabase
    .from('topics')
    .select('order')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .order('order', { ascending: false })
    .limit(1);

  if (parentId) {
    orderQuery = orderQuery.eq('parent_id', parentId);
  } else {
    orderQuery = orderQuery.is('parent_id', null);
  }

  const { data: lastSibling, error: orderError } = await orderQuery;

  if (orderError) {
    return {
      topic: null,
      error: orderError,
    };
  }

  const nextOrder =
    lastSibling && lastSibling.length > 0
      ? Number(lastSibling[0].order) + 1
      : 1;

  const { data, error } = await supabase
    .from('topics')
    .insert({
      user_id: userId,
      course_id: courseId,
      parent_id: parentId,
      title: cleanTitle,
      order: nextOrder,
      status: 'not_started',
    })
    .select()
    .single();

  return {
    topic: data ?? null,
    error,
  };
}

export async function deleteTopic(topicId) {
  const { data, error } = await supabase
    .from('topics')
    .delete()
    .eq('id', topicId)
    .select()
    .single();

  return {
    topic: data ?? null,
    error,
  };
}