import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — server-only, never expose to the browser.
 * Bypasses Row Level Security. Use only in trusted server contexts (admin routes).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
