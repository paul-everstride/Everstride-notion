import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses Row Level Security.
 * Only use server-side. Never expose to the browser.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
