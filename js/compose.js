// Compose page: pick a recipient, choose a file, post a letter (irreversible).

let _recipients = [];

async function loadRecipients() {
  const me = (await db.auth.getUser()).data.user;
  const { data, error } = await db
    .from("profiles")
    .select("id, first_name, lat, lng, city")
    .neq("id", me.id);
  if (error) throw error;
  _recipients = data || [];
  const sel = document.getElementById("recipient");
  sel.innerHTML = "";
  if (_recipients.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No one else has signed up yet";
    opt.disabled = true;
    sel.appendChild(opt);
    return;
  }
  for (const r of _recipients) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.first_name;
    sel.appendChild(opt);
  }
}

function setStatus(msg, isError) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = isError ? "status error" : "status";
}

async function postLetter(evt) {
  evt.preventDefault();
  const btn = document.getElementById("postBtn");
  const recipientId = document.getElementById("recipient").value;
  const fileInput = document.getElementById("file");
  const file = fileInput.files[0];

  if (!recipientId) return setStatus("Choose who it's for.", true);
  if (!file) return setStatus("Choose a file to send.", true);

  const recipient = _recipients.find((r) => r.id === recipientId);
  if (!recipient || recipient.lat == null || recipient.lng == null) {
    return setStatus("Your recipient hasn't set a location yet — ask them to post or open the app once.", true);
  }

  btn.disabled = true;
  try {
    // 1. Real device location (blocks if denied) + save as our last-known location.
    setStatus("Reading your location…");
    const here = await captureAndSaveLocation();

    // 2. Compute the delivery date from the real distance.
    const deliver = deliverAt(here, { lat: recipient.lat, lng: recipient.lng });

    // 3. Upload the sealed file to our own folder in the private bucket.
    setStatus("Sealing your letter…");
    const me = (await db.auth.getUser()).data.user;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${me.id}/${crypto.randomUUID()}-${safeName}`;
    const up = await db.storage.from("letters").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (up.error) throw up.error;

    // 4. Create the letter row.
    const ins = await db.from("letters").insert({
      sender_id: me.id,
      recipient_id: recipientId,
      file_path: path,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      origin_city: here.city,
      deliver_at: deliver.toISOString(),
    });
    if (ins.error) throw ins.error;

    const days = Math.round((deliver - Date.now()) / 86400000);
    setStatus(`Posted from ${here.city}. Arrives in about ${days} day${days === 1 ? "" : "s"}.`);
    document.getElementById("composeForm").reset();
  } catch (e) {
    setStatus(e.message || "Something went wrong.", true);
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireSession();
  await loadRecipients();
  document.getElementById("composeForm").addEventListener("submit", postLetter);
});
