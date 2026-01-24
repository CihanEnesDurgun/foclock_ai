import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rfalpcaqomscnoumnjhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w_e-t5CQ55JxjiOovuYlJg_HSKXvltB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
