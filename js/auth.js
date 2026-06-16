// Signup / login using a first name + password.
// Behind the scenes the first name becomes "<firstname>@digital-letters.local"
// so Supabase's email-based auth is happy. The user never sees the email.

function nameToEmail(firstName) {
  const clean = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean}@${EMAIL_DOMAIN}`;
}

async function signUp(firstName, password) {
  const email = nameToEmail(firstName);
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;

  // Create the profile row. (Email confirmation must be OFF in Supabase
  // so the user is signed in immediately after signUp.)
  const user = data.user;
  if (user) {
    const { error: pErr } = await db.from("profiles").insert({
      id: user.id,
      first_name: firstName.trim(),
    });
    // Ignore duplicate-profile errors on re-signup; surface anything else.
    if (pErr && pErr.code !== "23505") throw pErr;
  }
  return data;
}

async function logIn(firstName, password) {
  const email = nameToEmail(firstName);
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function logOut() {
  await db.auth.signOut();
  window.location.href = "index.html";
}
