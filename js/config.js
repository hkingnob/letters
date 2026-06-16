// ──────────────────────────────────────────────────────────────
// Digital Letters — configuration
//
// Fill these in with YOUR Supabase project values:
//   Supabase dashboard → Project Settings → API
//     • Project URL   → SUPABASE_URL
//     • anon public   → SUPABASE_ANON_KEY   (the "anon" / "public" key)
//
// The anon key is SAFE to commit to a public repo — it only works in
// combination with the row-level security rules in schema.sql.
// Do NOT put the "service_role" key here.
// ──────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Synthetic email domain used to turn a first name into a login.
// You never see this; it just satisfies Supabase's email-based auth.
const EMAIL_DOMAIN = "digital-letters.local";
