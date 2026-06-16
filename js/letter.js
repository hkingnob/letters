// Read one letter. Recipient breaks the seal (records opened_at) then sees the file.
// Sender can view their own sent letter at any time.

function qid() {
  return new URLSearchParams(window.location.search).get("id");
}

async function signedUrl(path) {
  const { data, error } = await db.storage.from("letters").createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

function showFile(url, type, name) {
  const wrap = document.getElementById("content");
  wrap.innerHTML = "";
  if (type && type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = name || "letter";
    img.className = "letter-image";
    wrap.appendChild(img);
  } else if (type === "application/pdf") {
    const f = document.createElement("iframe");
    f.src = url;
    f.className = "letter-pdf";
    wrap.appendChild(f);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "letter";
    a.className = "btn";
    a.textContent = `Download ${name || "the letter"}`;
    wrap.appendChild(a);
  }
}

async function main() {
  await requireSession();
  const me = (await db.auth.getUser()).data.user;
  const id = qid();
  const { data: letter, error } = await db.from("letters").select("*").eq("id", id).single();

  if (error || !letter) {
    document.getElementById("content").innerHTML = `<p class="empty">This letter isn't available.</p>`;
    return;
  }

  const isRecipient = letter.recipient_id === me.id;
  const sealEl = document.getElementById("seal");
  const printNudge = document.getElementById("printNudge");

  async function reveal() {
    sealEl.style.display = "none";
    const url = await signedUrl(letter.file_path);
    showFile(url, letter.file_type, letter.file_name);
    printNudge.style.display = "block";
  }

  if (isRecipient && !letter.opened_at) {
    // Show the sealed state; reveal on "break the seal".
    sealEl.style.display = "flex";
    document.getElementById("breakSeal").addEventListener("click", async () => {
      await db.from("letters").update({ opened_at: new Date().toISOString() }).eq("id", letter.id);
      await reveal();
    });
  } else {
    // Already opened, or the sender viewing their own letter.
    await reveal();
  }
}

document.addEventListener("DOMContentLoaded", main);
document.addEventListener("DOMContentLoaded", () => {
  const p = document.getElementById("printBtn");
  if (p) p.addEventListener("click", () => window.print());
});
