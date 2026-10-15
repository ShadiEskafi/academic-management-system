-- supabase/migrations/20261015_invite_codes.sql
-- إنشاء جدول أكواد الدعوة والشراكات (Invite Codes System) وتحديث دالة حجز المقعد الفوري

-- 1. جدول أكواد الدعوة
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    notes TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_uses INT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس لضمان كفاءة التحقق من الكود بغض النظر عن حالة الأحرف
CREATE UNIQUE INDEX IF NOT EXISTS invite_codes_upper_code_idx 
ON public.invite_codes (UPPER(code));

-- 2. تحديث جدول قائمة الانتظار waitlist لربط كود الدعوة
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS invite_code_id BIGINT REFERENCES public.invite_codes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_invite_code_id 
ON public.waitlist(invite_code_id);

-- 3. تفعيل RLS على جدول invite_codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- سياسات الأدمن الكاملة لجدول invite_codes
DROP POLICY IF EXISTS "Admins can view invite codes" ON public.invite_codes;
CREATE POLICY "Admins can view invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert invite codes" ON public.invite_codes;
CREATE POLICY "Admins can insert invite codes"
ON public.invite_codes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update invite codes" ON public.invite_codes;
CREATE POLICY "Admins can update invite codes"
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete invite codes" ON public.invite_codes;
CREATE POLICY "Admins can delete invite codes"
ON public.invite_codes
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 4. إدراج كود البداية الأولي لحاضنة Island Heaven
INSERT INTO public.invite_codes (code, name, notes, is_active)
VALUES (
    'ISLAND-HEAVEN',
    'Island Heaven - حاضنة طاقات وشباب',
    'كود الدخول والاعتماد الفوري لطلاب الجامعات في مجتمع أيلاند هيفين',
    true
)
ON CONFLICT (code) DO UPDATE 
SET is_active = true,
    name = EXCLUDED.name;

-- 5. تحديث دالة RPC الذرية join_or_get_waitlist لتدعم كود الدعوة والاعتماد التلقائي
CREATE OR REPLACE FUNCTION public.join_or_get_waitlist(
    p_name TEXT,
    p_major TEXT,
    p_university TEXT,
    p_email TEXT,
    p_invite_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record public.waitlist%ROWTYPE;
    v_next_seat INT;
    v_code_record public.invite_codes%ROWTYPE;
    v_invite_code_id BIGINT := NULL;
    v_status TEXT := 'pending';
    v_instant_approved BOOLEAN := false;
    v_community_name TEXT := NULL;
    v_clean_code TEXT;
BEGIN
    -- معالجة كود الدعوة في حال تم تمريره
    IF p_invite_code IS NOT NULL AND TRIM(p_invite_code) <> '' THEN
        v_clean_code := UPPER(TRIM(p_invite_code));
        
        SELECT * INTO v_code_record
        FROM public.invite_codes
        WHERE UPPER(code) = v_clean_code
        LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'كود الدعوة المدخل غير صالح أو غير موجود.';
        END IF;

        IF NOT v_code_record.is_active THEN
            RAISE EXCEPTION 'كود الدعوة هذا متوقف حالياً. يرجى مراجعة إدارة المجتمع.';
        END IF;

        v_invite_code_id := v_code_record.id;
        v_status := 'approved';
        v_instant_approved := true;
        v_community_name := v_code_record.name;
    END IF;

    -- 1. فحص هل البريد مسجل مسبقاً (Case-insensitive)
    SELECT * INTO v_record
    FROM public.waitlist
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

    IF FOUND THEN
        -- إذا كان مسجلاً وكانت حالته قيد الانتظار وأدخل الآن كوداً صحيحاً، يتم ترقيته واعتماده فوراً
        IF v_status = 'approved' AND (v_record.status IS NULL OR v_record.status = 'pending') THEN
            UPDATE public.waitlist
            SET status = 'approved',
                invite_code_id = v_invite_code_id
            WHERE id = v_record.id
            RETURNING * INTO v_record;

            RETURN jsonb_build_object(
                'success', true,
                'is_existing', true,
                'seat_number', v_record.seat_number,
                'name', v_record.name,
                'major', v_record.major,
                'university', v_record.university,
                'status', v_record.status,
                'instant_approved', true,
                'community_name', v_community_name
            );
        END IF;

        -- إرجاع السجل الموجود مسبقاً
        RETURN jsonb_build_object(
            'success', true,
            'is_existing', true,
            'seat_number', v_record.seat_number,
            'name', v_record.name,
            'major', v_record.major,
            'university', v_record.university,
            'status', COALESCE(v_record.status, 'pending'),
            'instant_approved', (v_record.status = 'approved' OR v_record.status = 'activated'),
            'community_name', v_community_name
        );
    END IF;

    -- 2. حماية التزامن وحساب رقم المقعد التالي
    LOCK TABLE public.waitlist IN SHARE ROW EXCLUSIVE MODE;

    SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_next_seat FROM public.waitlist;

    -- 3. إدراج السجل الجديد بالحالة المناسبة
    INSERT INTO public.waitlist (
        seat_number, 
        name, 
        major, 
        university, 
        email, 
        status, 
        invite_code_id
    )
    VALUES (
        v_next_seat, 
        p_name, 
        p_major, 
        p_university, 
        LOWER(p_email), 
        v_status, 
        v_invite_code_id
    )
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
        'success', true,
        'is_existing', false,
        'seat_number', v_record.seat_number,
        'name', v_record.name,
        'major', v_record.major,
        'university', v_record.university,
        'status', v_record.status,
        'instant_approved', v_instant_approved,
        'community_name', v_community_name
    );
END;
$$;

-- منح أذونات التنفيذ للدالة
GRANT EXECUTE ON FUNCTION public.join_or_get_waitlist(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
