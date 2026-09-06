// src/api/availability.js
// خدمات CRUD وإدارة أوقات التفرغ الأسبوعية مع فحص منع التعارض الزمني (UC-12 & BR-8)

import { supabase } from './supabaseClient.js';

export const DAYS_OF_WEEK = [
  { key: 'sunday', label: 'الأحد', order: 1 },
  { key: 'monday', label: 'الإثنين', order: 2 },
  { key: 'tuesday', label: 'الثلاثاء', order: 3 },
  { key: 'wednesday', label: 'الأربعاء', order: 4 },
  { key: 'thursday', label: 'الخميس', order: 5 },
  { key: 'friday', label: 'الجمعة', order: 6 },
  { key: 'saturday', label: 'السبت', order: 7 },
];

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).split('+')[0].trim();
  const [h, m] = clean.split(':').map((num) => parseInt(num, 10) || 0);
  return h * 60 + m;
}

export function formatTimeDisplay(timeStr) {
  if (!timeStr) return '--:--';
  const clean = String(timeStr).split('+')[0].trim();
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

export function calculateSlotDurationMinutes(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end > start ? end - start : 0;
}

export function hasSlotOverlap(newStart, newEnd, existingSlots, excludeSlotId = null) {
  const newStartMin = timeToMinutes(newStart);
  const newEndMin = timeToMinutes(newEnd);

  return existingSlots.some((slot) => {
    if (excludeSlotId && slot.id === excludeSlotId) return false;
    const existingStartMin = timeToMinutes(slot.start_time);
    const existingEndMin = timeToMinutes(slot.end_time);

    // فحص التداخل الرياضي: (StartA < EndB) AND (EndA > StartB)
    return newStartMin < existingEndMin && newEndMin > existingStartMin;
  });
}

export async function fetchAvailability() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return { slots: [], error: userError || new Error('المستخدم غير مسجل الدخول.') };
  }

  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) {
    return { slots: [], error };
  }

  // ترتيب الأيام وفق أيام الأسبوع المعتمدة
  const sorted = (data || []).sort((a, b) => {
    const dayOrderA = DAYS_OF_WEEK.find((d) => d.key === a.day_of_week)?.order || 99;
    const dayOrderB = DAYS_OF_WEEK.find((d) => d.key === b.day_of_week)?.order || 99;
    if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  });

  return { slots: sorted, error: null };
}

export async function createAvailabilitySlot({ dayOfWeek, startTime, endTime }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    return { slot: null, error: userError || new Error('المستخدم غير مسجل الدخول.') };
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin <= startMin) {
    return { slot: null, error: new Error('وقت نهاية الفترة يجب أن يكون بعد وقت البداية.') };
  }

  // جلب الفترات الحالية لنفس اليوم لفحص التداخل
  const { slots: daySlots, error: fetchErr } = await fetchAvailability();
  if (fetchErr) return { slot: null, error: fetchErr };

  const currentDaySlots = daySlots.filter((s) => s.day_of_week === dayOfWeek);
  if (hasSlotOverlap(startTime, endTime, currentDaySlots)) {
    return {
      slot: null,
      error: new Error('تتعارض هذه الفترة مع فترة تفرغ أخرى مسجلة مسبقاً في نفس اليوم.'),
    };
  }

  const normalizedStart = `${formatTimeDisplay(startTime)}:00+00`;
  const normalizedEnd = `${formatTimeDisplay(endTime)}:00+00`;

  const { data, error } = await supabase
    .from('availability')
    .insert({
      user_id: userId,
      day_of_week: dayOfWeek,
      start_time: normalizedStart,
      end_time: normalizedEnd,
    })
    .select()
    .single();

  return { slot: data || null, error };
}

export async function updateAvailabilitySlot(slotId, { dayOfWeek, startTime, endTime }) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin <= startMin) {
    return { slot: null, error: new Error('وقت نهاية الفترة يجب أن يكون بعد وقت البداية.') };
  }

  const { slots: daySlots, error: fetchErr } = await fetchAvailability();
  if (fetchErr) return { slot: null, error: fetchErr };

  const currentDaySlots = daySlots.filter((s) => s.day_of_week === dayOfWeek);
  if (hasSlotOverlap(startTime, endTime, currentDaySlots, slotId)) {
    return {
      slot: null,
      error: new Error('تتعارض هذه الفترة مع فترة تفرغ أخرى مسجلة مسبقاً في نفس اليوم.'),
    };
  }

  const normalizedStart = `${formatTimeDisplay(startTime)}:00+00`;
  const normalizedEnd = `${formatTimeDisplay(endTime)}:00+00`;

  const { data, error } = await supabase
    .from('availability')
    .update({
      day_of_week: dayOfWeek,
      start_time: normalizedStart,
      end_time: normalizedEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', slotId)
    .select()
    .single();

  return { slot: data || null, error };
}

export async function deleteAvailabilitySlot(slotId) {
  const { data, error } = await supabase
    .from('availability')
    .delete()
    .eq('id', slotId)
    .select()
    .single();

  return { slot: data || null, error };
}

export function calculateTotalWeeklyHours(slots = []) {
  let totalMinutes = 0;
  slots.forEach((s) => {
    totalMinutes += calculateSlotDurationMinutes(s.start_time, s.end_time);
  });

  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  return {
    totalMinutes,
    totalHoursDecimal: (totalMinutes / 60).toFixed(1),
    formattedText: remainingMins === 0 ? `${hours} ساعة` : `${hours} ساعة و ${remainingMins} دقيقة`,
  };
}