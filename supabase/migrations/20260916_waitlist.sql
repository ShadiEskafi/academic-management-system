-- Ensure waitlist table structure
CREATE TABLE IF NOT EXISTS public.waitlist (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    seat_number INT UNIQUE,
    name TEXT NOT NULL,
    major TEXT NOT NULL,
    university TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Functional Unique Index for Case-Insensitive Email Lookups & Constraint
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_lower_email_idx 
ON public.waitlist (LOWER(email));

-- 2. Idempotent registration RPC function
CREATE OR REPLACE FUNCTION public.join_or_get_waitlist(
    p_name TEXT,
    p_major TEXT,
    p_university TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record public.waitlist%ROWTYPE;
    v_next_seat INT;
BEGIN
    -- 1. Check if email already registered (Case-insensitive)
    SELECT * INTO v_record
    FROM public.waitlist
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_existing', true,
            'seat_number', v_record.seat_number,
            'name', v_record.name,
            'major', v_record.major,
            'university', v_record.university
        );
    END IF;

    -- 2. Concurrency protection & determine contiguous seat number
    LOCK TABLE public.waitlist IN SHARE ROW EXCLUSIVE MODE;

    SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_next_seat FROM public.waitlist;

    -- 3. Insert new record
    INSERT INTO public.waitlist (seat_number, name, major, university, email)
    VALUES (v_next_seat, p_name, p_major, p_university, LOWER(p_email))
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
        'success', true,
        'is_existing', false,
        'seat_number', v_record.seat_number,
        'name', v_record.name,
        'major', v_record.major,
        'university', v_record.university
    );
END;
$$;

-- 3. Enable RLS and Grant Permissions
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Grant execute permissions to anonymous and authenticated users for the RPC
GRANT EXECUTE ON FUNCTION public.join_or_get_waitlist(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

