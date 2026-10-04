import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SRV  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side (anon key — respects RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Server-side (service role — bypasses RLS for admin operations)
export const supabaseAdmin = () => createClient(SUPABASE_URL, SUPABASE_SRV);
