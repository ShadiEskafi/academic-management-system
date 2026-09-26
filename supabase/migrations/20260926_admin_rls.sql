-- supabase/migrations/20260926_admin_rls.sql
-- تأمين قاعدة البيانات وتفعيل سياسات RLS للوحة تحكم الأدمن وقائمة الانتظار

-- 1. إضافة عمود role إلى profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
CHECK (role IN ('student', 'admin', 'moderator'));

-- إنشاء فهرس لتحسين كفاءة البحث والتحقق من الصلاحيات
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(id, role);

-- 2. إنشاء دالة is_admin() محصنة بـ SECURITY DEFINER لمنع الـ Infinite Recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. سياسات جدول profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 4. سياسات جدول waitlist
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update waitlist" ON public.waitlist;
CREATE POLICY "Admins can update waitlist"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete waitlist" ON public.waitlist;
CREATE POLICY "Admins can delete waitlist"
ON public.waitlist
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5. ترقية / إنشاء حساب الأدمن للبريد shadieskafi@gmail.com
INSERT INTO public.profiles (id, full_name, role)
SELECT id, 'Shadi Eskafi (Admin)', 'admin'
FROM auth.users
WHERE email = 'shadieskafi@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 6. ترقيع ثغرة تصعيد الصلاحيات (Privilege Escalation Patch)
-- منع أي مستخدم غير مرخص من تعديل عمود role عبر Trigger دفاعي
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Privilege Escalation Denied: لا تملك صلاحية تعديل رتبة الحساب';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

