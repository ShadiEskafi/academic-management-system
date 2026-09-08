// src/api/courses.js

// UC-05 (Manage Course)
// معالجة استعلامات المساقات وحساب الإحصائيات بطلب شبكة موحد

import { supabase } from "./supabaseClient.js";

/**
 * Fetch all courses for a semester
 * including their topics and calculated progress statistics.
 */
export async function fetchCoursesBySemester(semesterId) {
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      topics!topics_course_id_fkey (
        id,
        title,
        status,
        parent_id,
        "order"
      )
    `,
    )
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses with topics:", error);

    return {
      courses: [],
      error,
    };
  }

  const enriched = (courses ?? []).map((course) => {
    const rawTopics = course.topics ?? [];

    // تحديد العقد الأبوية
    // وهي Topics التي تملك أبناء، وبالتالي لا تدخل في حساب التقدم.
    const parentIds = new Set(
      rawTopics.map((topic) => topic.parent_id).filter(Boolean),
    );

    // استخراج الأوراق القابلة للدراسة فقط (Leaf Topics)
    // وترتيبها حسب order.
    const leafTopics = rawTopics
      .filter((topic) => !parentIds.has(topic.id))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // إجمالي المواضيع القابلة للدراسة.
    const totalTopics = leafTopics.length;

    // المواضيع المكتملة.
    const completedTopics = leafTopics.filter(
      (topic) => topic.status === "completed",
    ).length;

    // حساب نسبة التقدم.
    const progressPercentage =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // --------------------------------------------------
    // تحديد الـ Current Position
    // --------------------------------------------------

    let topicId = course.current_position_topic_id || null;

    let topicTitle = null;

    // إذا كان هناك Current Position محفوظ في قاعدة البيانات
    // نحاول جلب عنوانه.
    if (topicId) {
      const currentTopic = rawTopics.find((topic) => topic.id === topicId);

      if (currentTopic) {
        topicTitle = currentTopic.title;
      }
    }

    // إذا لم نجد Current Position صالحًا،
    // نأخذ أول Leaf Topic غير مكتمل.
    if (!topicTitle) {
      const firstPending = leafTopics.find(
        (topic) => topic.status !== "completed",
      );

      if (firstPending) {
        topicId = firstPending.id;
        topicTitle = firstPending.title;
      }
    }

    // --------------------------------------------------
    // Return enriched course
    // --------------------------------------------------

    return {
      ...course,

      totalTopics,
      completedTopics,

      progressPercentage,
      progress: progressPercentage,

      current_position_topic_id: topicId,
      current_position_topic_title: topicTitle,

      // Backward-compatible aliases
      currentPositionTitle: topicTitle,
      current_topic_title: topicTitle,

      current_topic: topicTitle
        ? {
            id: topicId,
            title: topicTitle,
          }
        : null,
    };
  });

  return {
    courses: enriched,
    error: null,
  };
}

/**
 * Create a new course.
 */
export async function createCourse({
  semesterId,
  title,
  creditHours,
  difficulty,
  priority = "medium",
}) {
  const { data: userData } = await supabase.auth.getUser();

  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from("courses")
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

  return {
    course: data ?? null,
    error,
  };
}

/**
 * Update an existing course.
 */
export async function updateCourse(
  courseId,
  { title, creditHours, difficulty, priority },
) {
  const payload = {};

  if (title !== undefined) {
    payload.title = title;
  }

  if (creditHours !== undefined) {
    payload.credit_hours = creditHours;
  }

  if (difficulty !== undefined) {
    payload.difficulty = difficulty;
  }

  if (priority !== undefined) {
    payload.priority = priority;
  }

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .select()
    .single();

  return {
    course: data ?? null,
    error,
  };
}

/**
 * Delete a course.
 */
export async function deleteCourse(courseId) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);

  return {
    error,
  };
}

/**
 * Fetch a single course by ID.
 */
export async function fetchCourseById(courseId) {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      semesters (
        id,
        title
      )
    `,
    )
    .eq("id", courseId)
    .single();

  return {
    course: data ?? null,
    error,
  };
}
