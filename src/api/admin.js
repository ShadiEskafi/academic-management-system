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
 * @returns {Promise<{ waitlist: Array, profiles: Array, inviteCodes: Array, metrics: Object }>}
 */
export async function getAdminDashboardData() {
  const [waitlistRes, profilesRes, inviteCodesRes] = await Promise.all([
    supabase
      .from('waitlist')
      .select('*, invite_codes(id, code, name)')
      .order('seat_number', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, major, university, role, seat_number, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  if (waitlistRes.error) {
    throw new Error(`تعذر جلب بيانات قائمة الانتظار: ${waitlistRes.error.message}`);
  }
  if (profilesRes.error) {
    throw new Error(`تعذر جلب بيانات الطلاب: ${profilesRes.error.message}`);
  }
  if (inviteCodesRes.error) {
    throw new Error(`تعذر جلب بيانات أكواد الدعوة: ${inviteCodesRes.error.message}`);
  }

  const waitlist = waitlistRes.data || [];
  const profiles = profilesRes.data || [];
  const inviteCodes = inviteCodesRes.data || [];

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
  const codeUsageMap = {}; // codeId -> count

  waitlist.forEach((item) => {
    const s = item.status || 'pending';
    statusCounts[s] = (statusCounts[s] || 0) + 1;

    if (item.university) {
      uniMap[item.university] = (uniMap[item.university] || 0) + 1;
    }
    if (item.major) {
      majorMap[item.major] = (majorMap[item.major] || 0) + 1;
    }
    if (item.invite_code_id) {
      codeUsageMap[item.invite_code_id] = (codeUsageMap[item.invite_code_id] || 0) + 1;
    }
  });

  const approvedCount = statusCounts.approved || 0;
  const conversionRate = totalWaitlist > 0 ? ((approvedCount / totalWaitlist) * 100).toFixed(1) : '0.0';

  const totalCodes = inviteCodes.length;
  const activeCodes = inviteCodes.filter((c) => c.is_active).length;
  const totalStudentsWithCodes = waitlist.filter((w) => Boolean(w.invite_code_id)).length;

  return {
    waitlist,
    profiles,
    inviteCodes,
    metrics: {
      totalWaitlist,
      totalProfiles,
      studentsCount,
      statusCounts,
      conversionRate,
      uniMap,
      majorMap,
      codeUsageMap,
      totalCodes,
      activeCodes,
      totalStudentsWithCodes,
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

/**
 * إنشاء كود دعوة جديد
 * @param {Object} params
 * @param {string} params.code - الكود
 * @param {string} params.name - اسم الجهة / الشريك
 * @param {string} [params.notes] - ملاحظات
 * @param {number|null} [params.max_uses] - الحد الأقصى للاستخدام
 * @returns {Promise<Object>}
 */
export async function createInviteCode({ code, name, notes = '', max_uses = null }) {
  const cleanCode = String(code || '').trim().toUpperCase();
  const cleanName = String(name || '').trim();
  const cleanNotes = String(notes || '').trim();

  if (!cleanCode || !cleanName) {
    throw new Error('يرجى إدخال الكود واسم الجهة أو الشريك.');
  }

  const { data, error } = await supabase
    .from('invite_codes')
    .insert([
      {
        code: cleanCode,
        name: cleanName,
        notes: cleanNotes,
        is_active: true,
        max_uses: max_uses ? Number(max_uses) : null,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`كود الدعوة (${cleanCode}) موجود بالفعل مسبقاً.`);
    }
    throw new Error(`تعذر إنشاء كود الدعوة: ${error.message}`);
  }

  return data;
}

/**
 * تحديث بيانات كود دعوة
 * @param {number|string} id - معرّف الكود
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function updateInviteCode(id, { code, name, notes, is_active, max_uses }) {
  const cleanId = Number(id);
  const updates = {};

  if (code !== undefined) updates.code = String(code || '').trim().toUpperCase();
  if (name !== undefined) updates.name = String(name || '').trim();
  if (notes !== undefined) updates.notes = String(notes || '').trim();
  if (is_active !== undefined) updates.is_active = Boolean(is_active);
  if (max_uses !== undefined) updates.max_uses = max_uses ? Number(max_uses) : null;

  const { data, error } = await supabase
    .from('invite_codes')
    .update(updates)
    .eq('id', cleanId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('هذا الكود مستخدم بالفعل من قبل كود آخر.');
    }
    throw new Error(`تعذر تحديث كود الدعوة: ${error.message}`);
  }

  return data;
}

/**
 * تبديل حالة كود الدعوة (نشط / محظور)
 * @param {number|string} id - معرّف الكود
 * @param {boolean} isActive - الحالة الجديدة
 * @returns {Promise<Object>}
 */
export async function toggleInviteCodeStatus(id, isActive) {
  return updateInviteCode(id, { is_active: isActive });
}

/**
 * حذف كود دعوة
 * @param {number|string} id - معرّف الكود
 * @returns {Promise<boolean>}
 */
export async function deleteInviteCode(id) {
  const cleanId = Number(id);
  const { error } = await supabase
    .from('invite_codes')
    .delete()
    .eq('id', cleanId);

  if (error) {
    throw new Error(`تعذر حذف كود الدعوة: ${error.message}`);
  }

  return true;
}
