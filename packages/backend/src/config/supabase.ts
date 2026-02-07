import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseInstance;
}

// For backwards compatibility, export supabase as a getter
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  }
});
