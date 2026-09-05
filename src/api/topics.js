// src/api/topics.js
// إدارة Topics — جلب الشجرة، تحديث الحالة والاسم، إنشاء وحذف Topics.

import { supabase } from "./supabaseClient.js";

export async function fetchTopicTree(courseId) {
  const { data, error } = await supabase.rpc("get_course_topic_tree", {
    p_course_id: courseId,
  });

  return { topics: data ?? [], error };
}

export async function updateTopic(topicId, updates) {
  const payload = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from("topics")
    .update(payload)
    .eq("id", topicId)
    .select()
    .single();

  return { topic: data ?? null, error };
}

export async function updateTopicStatus(topicId, status) {
  return updateTopic(topicId, { status });
}

export async function createTopic({ courseId, parentId = null, title }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return {
      topic: null,
      error: userError ?? new Error("المستخدم غير مسجل الدخول."),
    };
  }

  const cleanTitle = String(title ?? "").trim();

  if (!cleanTitle) {
    return {
      topic: null,
      error: new Error("عنوان الـ Topic مطلوب."),
    };
  }

  // التأكد أن الـ Course تابع للمستخدم الحالي
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("user_id", userId)
    .single();

  if (courseError || !course) {
    return {
      topic: null,
      error: courseError ?? new Error("المساق غير موجود أو غير متاح."),
    };
  }

  // إذا كان Topic فرعيًا، نتأكد أن الـ Parent:
  // 1. تابع لنفس المستخدم
  // 2. تابع لنفس الـ Course
  let parent = null;

  if (parentId) {
    const { data: parentData, error: parentError } = await supabase
      .from("topics")
      .select("id, course_id, parent_id")
      .eq("id", parentId)
      .eq("user_id", userId)
      .single();

    if (parentError || !parentData) {
      return {
        topic: null,
        error: parentError ?? new Error("الـ Parent Topic غير موجود."),
      };
    }

    if (parentData.course_id !== courseId) {
      return {
        topic: null,
        error: new Error("لا يمكن إضافة Topic تحت Parent من مساق آخر."),
      };
    }

    parent = parentData;
  }

  // جلب آخر Order لنفس الـ Siblings
  let orderQuery = supabase
    .from("topics")
    .select("order")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .order("order", { ascending: false })
    .limit(1);

  if (parentId) {
    orderQuery = orderQuery.eq("parent_id", parentId);
  } else {
    orderQuery = orderQuery.is("parent_id", null);
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
    .from("topics")
    .insert({
      user_id: userId,
      course_id: courseId,
      parent_id: parentId,
      title: cleanTitle,
      order: nextOrder,
      status: "not_started",
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
    .from("topics")
    .delete()
    .eq("id", topicId)
    .select()
    .single();

  return {
    topic: data ?? null,
    error,
  };
}

// --- "سجّل إنجاز جديد" — دعم Feature الـ Current Position (FR-6) ---

/**
 * قائمة قصيرة من الـ Topics غير المكتملة (القابلة للدراسة — بدون أبناء)
 * تبع مساق معيّن، لعرضها كخيارات جاهزة بـ Modal "سجّل إنجاز" بدل ما المستخدم
 * يضطر يفتح الشجرة الكاملة أو يكتب اسم موضوع من الصفر كل مرة.
 */
export async function fetchIncompleteLeafTopics(courseId, limit = 5) {
  const { topics, error } = await fetchTopicTree(courseId);
  if (error) return { topics: [], error };

  const parentIds = new Set(
    topics.filter((t) => t.parent_id).map((t) => t.parent_id),
  );
  const leaves = topics
    .filter((t) => !parentIds.has(t.id) && t.status !== "completed")
    .sort((a, b) => Number(a.order) - Number(b.order));

  return { topics: leaves.slice(0, limit), error: null };
}

/**
 * يسجّل Topic كمنجَز، وبيحدّث الـ Current Position تلقائيًا (RPC، Phase 04+FR-6):
 * الموضع بينتقل لأول Study-able Topic غير مكتمل بالترتيب الهرمي، أو NULL لو خلص المساق.
 */
export async function completeTopicAndAdvance(courseId, topicId) {
  const { data, error } = await supabase.rpc("complete_topic_and_advance", {
    p_course_id: courseId,
    p_topic_id: topicId,
  });

  return { nextTopicId: data?.nextTopicId ?? null, error };
}