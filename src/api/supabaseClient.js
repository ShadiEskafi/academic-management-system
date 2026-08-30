// src/api/supabaseClient.js
// نقطة الاتصال الوحيدة بـ Supabase. أي ملف تاني بـ src/api/ لازم يستورد من هون،
// ما بينشئ Client جديد لحاله.
// ممنوع هالملف (أو أي ملف بـ src/api/) يلمس الـ DOM أو الـ state مباشرة —
// بس يرجّع بيانات، والـ caller (عادةً من src/pages/) هو يلي بيحدّث الـ store.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — تأكد من ملف .env (انظر .env.example)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);