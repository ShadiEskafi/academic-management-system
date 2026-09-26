// src/api/admin.js
// دوال الاتصال بالشبكة الخاصة بلوحة تحكم الأدمن (Pure Network Functions)
// ممنوع مساس الـ DOM أو الـ Global Store داخل هذا الملف.
// تطبق معيار $O(1)$ Aggregated Fetching لمنع استعلامات N+1.

import { supabase } from './supabaseClient.js';

/**
 * فحص رتبة المستخدم الحالي وصلاحيته كأدمن
 * @returns {Promise<{ user: any, profile: any, role: string, isAdmin: boolean }>}
 */
export async function checkCurrentUserRole() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, profile: null, role: null, isAdmin: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, university, major, seat_number')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching user profile role:', profileError);
    return { user, profile: null, role: null, isAdmin: false };
  }

  const role = profile?.role || 'student';
  return {
    user,
    profile,
    role,
    isAdmin: role === 'admin',
  };
}

/**
 * جلب بيانات وإحصائيات لوحة تحكم الأدمن بطلب مجمّع موحد O(1)
 * @returns {Promise<{ waitlist: Array, profiles: Array, metrics: Object }>}
 */
export async function getAdminDashboardData() {
  const [waitlistRes, profilesRes] = await Promise.all([
    supabase
      .from('waitlist')
      .select('*')
      .order('seat_number', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, major, university, role, seat_number, created_at')
      .order('created_at', { ascending: false }),
  ]);

  if (waitlistRes.error) {
    throw new Error(`تعذر جلب بيانات قائمة الانتظار: ${waitlistRes.error.message}`);
  }
  if (profilesRes.error) {
    throw new Error(`تعذر جلب بيانات الطلاب: ${profilesRes.error.message}`);
  }

  const waitlist = waitlistRes.data || [];
  const profiles = profilesRes.data || [];

  const totalWaitlist = waitlist.length;
  const totalProfiles = profiles.length;
  const studentsCount = profiles.filter((p) => p.role === 'student').length;

  const statusCounts = {
    pending: 0,
    approved: 0,
    contacted: 0,
    archived: 0,
  };

  const uniMap = {};
  const majorMap = {};

  waitlist.forEach((item) => {
    const s = item.status || 'pending';
    statusCounts[s] = (statusCounts[s] || 0) + 1;

    if (item.university) {
      uniMap[item.university] = (uniMap[item.university] || 0) + 1;
    }
    if (item.major) {
      majorMap[item.major] = (majorMap[item.major] || 0) + 1;
    }
  });

  const approvedCount = statusCounts.approved || 0;
  const conversionRate = totalWaitlist > 0 ? ((approvedCount / totalWaitlist) * 100).toFixed(1) : '0.0';

  return {
    waitlist,
    profiles,
    metrics: {
      totalWaitlist,
      totalProfiles,
      studentsCount,
      statusCounts,
      conversionRate,
      uniMap,
      majorMap,
    },
  };
}

/**
 * تحديث حالة مسجل في قائمة الانتظار (pending, approved, contacted, archived)
 * @param {number|string} id - معرّف السجل
 * @param {string} newStatus - الحالة الجديدة
 * @returns {Promise<Object>}
 */
export async function updateWaitlistStatus(id, newStatus) {
  const cleanId = Number(id);
  const cleanStatus = String(newStatus || '').trim().toLowerCase();

  const allowedStatuses = ['pending', 'approved', 'contacted', 'archived'];
  if (!allowedStatuses.includes(cleanStatus)) {
    throw new Error('الحالة المحددة غير صالحة.');
  }

  const { data, error } = await supabase
    .from('waitlist')
    .update({ status: cleanStatus })
    .eq('id', cleanId)
    .select()
    .single();

  if (error) {
    throw new Error(`تعذر تحديث حالة الطلب: ${error.message}`);
  }

  return data;
}

/**
 * حذف سجل من قائمة الانتظار
 * @param {number|string} id - معرّف السجل
 * @returns {Promise<boolean>}
 */
export async function deleteWaitlistEntry(id) {
  const cleanId = Number(id);
  const { error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', cleanId);

  if (error) {
    throw new Error(`تعذر حذف السجل: ${error.message}`);
  }

  return true;
}
