// Mailbox: received letters (sealed until you open them) + letters you've sent.

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(iso) {
  return Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
}

// Best-effort: quietly refresh our last-known location when we open the app,
// so a friend can address a letter to us even before we post anything.
// Never blocks the page; silently ignores a denied prompt.
async function refreshLocationQuietly() {
  try { await captureAndSaveLocation(); } catch { /* ignore */ }
}

async function nameFor(id, cache) {
  if (cache[id]) return cache[id];
  const { data } = await db.from("profiles").select("first_name").eq("id", id).single();
  cache[id] = data ? data.first_name : "Someone";
  return cache[id];
}

async function render() {
  const me = (await db.auth.getUser()).data.user;
  const { data: letters, error } = await db
    .from("letters")
    .select("*")
    .order("posted_at", { ascending: false });
  if (error) { console.error(error); return; }

  const names = {};
  const received = letters.filter((l) => l.recipient_id === me.id); // RLS => already arrived
  const sent = letters.filter((l) => l.sender_id === me.id);

  // ── Received ──
  const rWrap = document.getElementById("received");
  rWrap.innerHTML = "";
  if (received.length === 0) {
    rWrap.innerHTML = `<p class="empty">No letters have arrived. When one does, you'll find it here.</p>`;
  }
  for (const l of received) {
    const from = await nameFor(l.sender_id, names);
    const opened = !!l.opened_at;
    const card = document.createElement("a");
    card.className = "envelope" + (opened ? " opened" : "");
    card.href = `letter.html?id=${l.id}`;
    card.innerHTML = `
      <div class="seal">${opened ? "" : "✉"}</div>
      <div class="postmark">
        <div class="from">From ${from}</div>
        <div class="origin">${l.origin_city || ""}</div>
        <div class="date">Posted ${fmtDate(l.posted_at)}</div>
      </div>
      <div class="hint">${opened ? "Read again" : "Sealed — tap to open"}</div>`;
    rWrap.appendChild(card);
  }

  // ── Sent ──
  const sWrap = document.getElementById("sent");
  sWrap.innerHTML = "";
  if (sent.length === 0) {
    sWrap.innerHTML = `<p class="empty">You haven't posted anything yet.</p>`;
  }
  for (const l of sent) {
    const to = await nameFor(l.recipient_id, names);
    const arrived = new Date(l.deliver_at) <= new Date();
    let status, cls;
    if (l.opened_at) { status = `Opened ${fmtDate(l.opened_at)}`; cls = "st-opened"; }
    else if (arrived) { status = "Arrived"; cls = "st-arrived"; }
    else { status = `In transit · arrives in ${daysUntil(l.deliver_at)} day${daysUntil(l.deliver_at) === 1 ? "" : "s"}`; cls = "st-transit"; }

    const row = document.createElement("div");
    row.className = "sentrow";
    row.innerHTML = `
      <div class="sent-to">To ${to}</div>
      <div class="sent-meta">${l.file_name || "letter"} · from ${l.origin_city || "?"} · posted ${fmtDate(l.posted_at)}</div>
      <div class="badge ${cls}">${status}</div>`;
    sWrap.appendChild(row);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  const me = await currentProfile();
  if (me) document.getElementById("hello").textContent = `${me.first_name}'s desk`;
  document.getElementById("logout").addEventListener("click", logOut);
  await render();
  refreshLocationQuietly(); // non-blocking
});
