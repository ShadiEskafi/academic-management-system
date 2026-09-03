// src/api/topics.js
// استدعاء RPC لجلب الشجرة وتحديث حالة الـ Leaf Topics
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