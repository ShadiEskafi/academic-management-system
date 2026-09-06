// src/api/assessments.js
// مجمّع ومطبع بيانات الاستحقاقات (Facade & Aggregator) يدمج جدولين ويرتب الأحداث زمنياً

import {
  fetchAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from './assignments.js';

import {
  fetchExams,
  createExam,
  updateExam,
  deleteExam,
} from './exams.js';

export {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  createExam,
  updateExam,
  deleteExam,
};

/**
 * حساب فارق الأيام بين التاريخ واليوم الحالي
 */
function calculateDiffDays(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * جلب وتطبيع جميع استحقاقات المساق (واجبات وامتحانات) في مصفوفة موحدة مرتبة زمنياً
 */
export async function fetchCourseAssessments(courseId) {
  const [assignmentsResult, examsResult] = await Promise.all([
    fetchAssignments(courseId),
    fetchExams(courseId),
  ]);

  if (assignmentsResult.error) {
    return { assessments: [], error: assignmentsResult.error };
  }
  if (examsResult.error) {
    return { assessments: [], error: examsResult.error };
  }

  const normalizedAssignments = (assignmentsResult.assignments || []).map((item) => {
    const diffDays = calculateDiffDays(item.due_date);
    return {
      id: item.id,
      category: 'assignment',
      type: item.type || 'assignment',
      title: item.title,
      date: item.due_date,
      estimated_minutes: item.estimated_minutes,
      priority: item.priority || 'medium',
      status: item.status || 'pending',
      weight: null,
      diffDays,
      raw: item,
    };
  });

  const normalizedExams = (examsResult.exams || []).map((item) => {
    const diffDays = calculateDiffDays(item.exam_date);
    const isPast = diffDays !== null && diffDays < 0;
    return {
      id: item.id,
      category: 'exam',
      type: item.exam_type || 'midterm',
      title: item.title,
      date: item.exam_date,
      estimated_minutes: null,
      priority: item.exam_type === 'final' || item.exam_type === 'midterm' ? 'high' : 'medium',
      status: isPast ? 'completed' : 'pending',
      weight: item.weight,
      diffDays,
      raw: item,
    };
  });

  const combined = [...normalizedAssignments, ...normalizedExams];

  combined.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  return { assessments: combined, error: null };
}