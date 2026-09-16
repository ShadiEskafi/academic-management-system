// src/api/waitlist.js
// استدعاء دالة RPC التكرارية لتسجيل أو استرجاع بيانات المقعد في قائمة الانتظار
import { supabase } from './supabaseClient.js';

/**
 * تسجيل مستخدم في قائمة الانتظار أو استرجاع مقعده المسجل مسبقاً
 * @param {Object} params
 * @param {string} params.name - الاسم الكامل
 * @param {string} params.major - التخصص الجامعي
 * @param {string} params.university - اسم الجامعة
 * @param {string} params.email - البريد الإلكتروني
 * @returns {Promise<{success: boolean, is_existing: boolean, seat_number: number, name: string, major: string, university: string}>}
 */
export async function joinOrGetWaitlist({ name, major, university, email }) {
  const cleanName = String(name || '').trim();
  const cleanMajor = String(major || '').trim();
  const cleanUni = String(university || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName || !cleanMajor || !cleanUni || !cleanEmail) {
    throw new Error('يرجى ملء جميع الحقول المطلوبة للمتابعة.');
  }

  const { data, error } = await supabase.rpc('join_or_get_waitlist', {
    p_name: cleanName,
    p_major: cleanMajor,
    p_university: cleanUni,
    p_email: cleanEmail,
  });

  if (error) {
    console.error('Waitlist RPC error:', error);
    throw new Error(error.message || 'تعذر الاتصال بخادم قائمة الانتظار. يرجى المحاولة لاحقاً.');
  }

  return data;
}

