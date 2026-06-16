// Initialises the shared Supabase client.
// Requires the global `supabase` from the CDN script and config.js to load first.

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Redirect to login if not signed in. Call at the top of protected pages.
async function requireSession() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

// Convenience: the current user's profile row (creates nothing).
async function currentProfile() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("profiles").select("*").eq("id", user.id).single();
  return data;
}
