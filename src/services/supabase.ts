import { createClient } from '@supabase/supabase-js';

// Supabase erişim bilgileri .env.local dosyasından yüklenir
// .env.local dosyası .gitignore'da olmalı — kaynak koda credential gömülmez
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase ortam değişkenleri eksik. ' +
    '.env.local dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlayın.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
