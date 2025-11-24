import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Prefer service role for verification; fallback to anon if not provided.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY)');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
