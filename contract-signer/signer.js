// The contract signer (/contract-signer/): upload a PDF, read it, sign it with your finger, send it.
//
// Where the signature goes: the page looks in the PDF, in this order, and takes the first it finds:
//   1. the tag  [sign]  (or {{sign}}) written in the document: the signature goes exactly there, and covers the tag;
//   2. a signature field made in the PDF (Acrobat, Word "signature line" exported as a field);
//   3. the word "Signature" (or "Sign here", "Signed by"): the signature goes right after it, on that line;
//   4. a line of underscores ______ : the signature goes on it.
// When there are several, the LAST one in the document is used (that is usually the signer's block).
// Nothing found? The page asks you to tap the spot. You can always tap another spot to move the signature.
//
// Send: the signed PDF is stored (Netlify Blobs, function /api/contract) and the link is emailed through Web3Forms,
// the same way as everything else on the site (WEB3FORMS_KEY in /config.js). You can also download it.
const $ = (id) => document.getElementById(id);
pdfjsLib.GlobalWorkerOptions.workerSrc = "/contract-signer/lib/pdf.worker.min.js";

const SIG_HEIGHT = 34;  // CHANGE HERE: the height of the signature on the paper, in points (72 = one inch)
const SIG_MAX_W = 190;  // and its widest
const MAX_MB = 4.5;     // the biggest PDF that can be sent (the server takes about 6 MB with the signature)

let bytes = null;       // the uploaded PDF (Uint8Array)
let fileName = "";
let pdf = null;         // the document, opened with pdf.js
let views = [];         // per page: { el (the .page box), vp (viewport at scale 1) }
let spot = null;        // where the signature goes: { page (0 = first), x, y (bottom-left, PDF points), w, h, cover }
let sig = null;         // the signature: { url (PNG), ratio (width / height) }
let signer = "";        // the name typed in the signing window

// ------------------------------ 1. Upload ------------------------------
$("file").addEventListener("change", () => $("file").files[0] && load($("file").files[0]));
const drop = $("drop");
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, () => drop.classList.remove("over")));
drop.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); });

async function load(file) {
  $("fileError").textContent = "";
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { $("fileError").textContent = "That is not a PDF."; return; }
  if (file.size > MAX_MB * 1024 * 1024) { $("fileError").textContent = `The PDF is too big (the most is ${MAX_MB} MB).`; return; }
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise; // pdf.js takes its own copy
  } catch (err) {
    console.error("[PDF] could not open:", err);
    $("fileError").textContent = "This PDF could not be opened.";
    return;
  }
  fileName = file.name;
  sig = null; spot = null;
  $("fname").textContent = fileName;
  document.body.classList.add("loaded");
  $("doc").hidden = false; $("bar").hidden = false;
  showPages(true);
  stage();
  await render();
  spot = await findSpot();
  console.log("[PDF]", pdf.numPages, "pages · signature spot:", spot || "none: the signer taps it");
}

$("another").addEventListener("click", () => {
  bytes = pdf = sig = spot = null; views = [];
  $("pages").textContent = ""; $("file").value = "";
  document.body.classList.remove("loaded");
  $("doc").hidden = true; $("bar").hidden = true;
});

// ------------------------------ 2. Read: the pages ------------------------------
async function render() {
  const box = $("pages");
  box.textContent = "";
  views = [];
  const dpr = Math.min(devicePixelRatio || 1, 2.5);
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), vp = page.getViewport({ scale: 1 });
    const el = document.createElement("div"), canvas = document.createElement("canvas");
    el.className = "page";
    el.style.aspectRatio = `${vp.width} / ${vp.height}`;
    el.append(canvas);
    box.append(el);
    const scale = (Math.max(box.clientWidth, 320) * dpr) / vp.width;
    const big = page.getViewport({ scale });
    canvas.width = Math.round(big.width); canvas.height = Math.round(big.height);
    views.push({ el, vp });
    el.addEventListener("click", (e) => tapPlace(n - 1, e));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: big }).promise;
  }
}

$("toggle").addEventListener("click", () => showPages($("toggle").getAttribute("aria-expanded") !== "true"));
function showPages(open) {
  $("toggle").setAttribute("aria-expanded", open);
  $("pages").hidden = !open;
}

// ------------------------------ Where the signature goes ------------------------------
async function findSpot() {
  const found = { tag: [], field: [], word: [], line: [] };
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    for (const a of await page.getAnnotations()) {
      if (a.fieldType === "Sig" && a.rect) {
        const [x1, y1, x2, y2] = a.rect;
        found.field.push({ page: n - 1, x: Math.min(x1, x2) + 2, y: Math.min(y1, y2) + 2, boxW: Math.abs(x2 - x1) - 4, boxH: Math.abs(y2 - y1) - 4 });
      }
    }
    const { items } = await page.getTextContent();
    for (const it of items) {
      const s = it.str || "";
      if (!s.trim() || !it.transform) continue;
      const [, , c, d, x, y] = it.transform, size = Math.hypot(c, d) || 10;
      const at = (i) => x + (it.width * i) / s.length; // where character i starts (roughly)
      let m = s.match(/\[\s*sign(ature)?\s*\]|\{\{\s*sign(ature)?\s*\}\}/i);
      if (m) {
        found.tag.push({ page: n - 1, x: at(m.index), y: y - size * 0.35,
          cover: { x: at(m.index) - 1, y: y - size * 0.3, w: at(m.index + m[0].length) - at(m.index) + 2, h: size * 1.3 } });
        continue;
      }
      m = s.match(/(signature|sign here|signed by|underskrift|firma)\s*[:.]?/i);
      if (m) { found.word.push({ page: n - 1, x: at(m.index + m[0].length) + 6, y: y - size * 0.35 }); continue; }
      m = s.match(/_{5,}|\.{10,}/);
      if (m) found.line.push({ page: n - 1, x: at(m.index) + 4, y: y - size * 0.1 });
    }
  }
  const pick = found.tag.length ? found.tag : found.field.length ? found.field : found.word.length ? found.word : found.line;
  return pick.length ? pick[pick.length - 1] : null;
}

/** Tap a page (once there is a signature): the signature moves there, centred on the tap, standing on it. */
function tapPlace(i, e) {
  if (!sig) return;
  const { el, vp } = views[i], r = el.getBoundingClientRect();
  const k = vp.width / r.width; // screen pixels -> page pixels at scale 1
  const [x, y] = vp.convertToPdfPoint((e.clientX - r.left) * k, (e.clientY - r.top) * k);
  const h = SIG_HEIGHT, w = Math.min(SIG_MAX_W, h * sig.ratio);
  spot = { page: i, x: x - w / 2, y: y - h * 0.2 };
  place();
}

/** Draw the signature on the page where it will land (sizes and positions in % of the page, so it scales). */
function place(scroll) {
  document.querySelectorAll(".sig").forEach((s) => s.remove());
  views.forEach((v) => v.el.classList.toggle("placing", !!sig));
  if (!sig || !spot) return stage();
  let h = SIG_HEIGHT, w = h * sig.ratio;
  if (w > SIG_MAX_W) { w = SIG_MAX_W; h = w / sig.ratio; }
  if (spot.boxW) { const f = Math.min(1, spot.boxW / w, spot.boxH / h); w *= f; h *= f; } // fit into a signature field
  spot.w = w; spot.h = h;
  const { el, vp } = views[spot.page];
  const [ax, ay] = vp.convertToViewportPoint(spot.x, spot.y + h), [bx, by] = vp.convertToViewportPoint(spot.x + w, spot.y);
  const img = new Image();
  img.className = "sig"; img.src = sig.url; img.alt = "Your signature";
  Object.assign(img.style, {
    left: (Math.min(ax, bx) / vp.width) * 100 + "%", top: (Math.min(ay, by) / vp.height) * 100 + "%",
    width: (Math.abs(bx - ax) / vp.width) * 100 + "%", height: (Math.abs(by - ay) / vp.height) * 100 + "%",
  });
  el.append(img);
  if (scroll) { showPages(true); img.scrollIntoView({ behavior: "smooth", block: "center" }); }
  stage();
}

/** The bar: Sign first; once signed and placed: ✍️ (sign again) and Send. */
function stage() {
  const signed = !!sig, placed = signed && !!spot;
  $("sign").hidden = signed;
  $("resign").hidden = !signed;
  $("send").hidden = !signed;
  $("send").disabled = !placed;
  $("placeHint").hidden = !signed || placed;
  $("sendError").textContent = "";
}

// ------------------------------ 3. Sign: the pad ------------------------------
const ink = $("ink"), pen = ink.getContext("2d");
let strokes = [], line = null, bounds = null;

function openPad() {
  $("pad").hidden = false; $("padError").textContent = "";
  const r = ink.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
  ink.width = Math.round(r.width * dpr); ink.height = Math.round(r.height * dpr);
  pen.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokes = []; bounds = null;
  redraw();
  if (!$("name").value) $("name").focus();
}
$("sign").addEventListener("click", openPad);
$("resign").addEventListener("click", openPad);
$("padClose").addEventListener("click", () => { $("pad").hidden = true; });
$("pad").addEventListener("click", (e) => { if (e.target === $("pad")) $("pad").hidden = true; });
$("clearInk").addEventListener("click", () => { strokes = []; bounds = null; redraw(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") { $("pad").hidden = true; $("sent").hidden = true; } });

const point = (e) => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
ink.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ink.setPointerCapture(e.pointerId);
  line = [point(e)];
  strokes.push(line);
  grow(line[0]);
  redraw();
});
ink.addEventListener("pointermove", (e) => {
  if (!line) return;
  for (const ev of e.getCoalescedEvents ? e.getCoalescedEvents() : [e]) { const p = point(ev); line.push(p); grow(p); }
  redraw();
});
["pointerup", "pointercancel"].forEach((t) => ink.addEventListener(t, () => { line = null; }));
const grow = ([x, y]) => { bounds = bounds ? [Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y)] : [x, y, x, y]; };

/** The strokes, smoothed: curves through the middle points, like a felt pen. */
function draw(ctx, list, width) {
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0b0b0b"; ctx.fillStyle = "#0b0b0b"; ctx.lineWidth = width;
  for (const s of list) {
    if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0][0], s[0][1], width / 2, 0, Math.PI * 2); ctx.fill(); continue; }
    ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]);
    for (let i = 1; i < s.length - 1; i++) ctx.quadraticCurveTo(s[i][0], s[i][1], (s[i][0] + s[i + 1][0]) / 2, (s[i][1] + s[i + 1][1]) / 2);
    const last = s[s.length - 1]; ctx.lineTo(last[0], last[1]);
    ctx.stroke();
  }
}
function redraw() {
  pen.clearRect(0, 0, ink.width, ink.height);
  draw(pen, strokes, 3);
}

/** The signature as a PNG, cut to the strokes (transparent around them), sharp enough for print. */
function signatureImage() {
  const pad = 6, [x1, y1, x2, y2] = bounds, w = x2 - x1 + pad * 2, h = y2 - y1 + pad * 2, k = 4;
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const ctx = c.getContext("2d");
  ctx.setTransform(k, 0, 0, k, -(x1 - pad) * k, -(y1 - pad) * k);
  draw(ctx, strokes, 3);
  return { url: c.toDataURL("image/png"), ratio: w / h };
}

$("padForm").addEventListener("submit", (e) => {
  e.preventDefault();
  signer = $("name").value.trim();
  if (!signer) { $("padError").textContent = "Your name first."; $("name").focus(); return; }
  if (!bounds || strokes.reduce((n, s) => n + s.length, 0) < 4) { $("padError").textContent = "Sign in the white box."; return; }
  sig = signatureImage();
  $("pad").hidden = true;
  console.log("[SIGN] signed by", signer);
  place(true);
});

// ------------------------------ 4. Send ------------------------------
/** The signed PDF: the signature drawn on the page (and the [sign] tag covered), with the name and date under it. */
async function signedPdf() {
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPage(spot.page);
  const png = await doc.embedPng(sig.url);
  const c = spot.cover;
  if (c) page.drawRectangle({ x: c.x, y: c.y, width: c.w, height: c.h, color: PDFLib.rgb(1, 1, 1) }); // white over the [sign] tag
  page.drawImage(png, { x: spot.x, y: spot.y, width: spot.w, height: spot.h });
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const when = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  page.drawText(`${signer} · ${when}`.replace(/[^\x20-\x7E -ÿ·]/g, "?"), { x: spot.x, y: spot.y - 7, size: 6.5, font, color: PDFLib.rgb(0.35, 0.35, 0.35) });
  doc.setModificationDate(new Date());
  return doc.save();
}

$("send").addEventListener("click", async () => {
  const btn = $("send");
  btn.disabled = true; btn.textContent = "Sending…"; $("sendError").textContent = "";
  try {
    const out = await signedPdf();
    const signedName = fileName.replace(/\.pdf$/i, "") + " (signed).pdf";
    $("download").href = URL.createObjectURL(new Blob([out], { type: "application/pdf" }));
    $("download").download = signedName;

    // Store it, then email the link
    const res = await fetch("/api/contract", {
      method: "POST",
      headers: { "Content-Type": "application/pdf", "X-Name": encodeURIComponent(signer), "X-File": encodeURIComponent(signedName) },
      body: out,
    });
    const data = await res.json().catch(() => ({}));
    console.log("[CONTRACT] stored:", res.status, data);
    if (!res.ok || !data.url) throw new Error(data.error || `The server answered ${res.status}.`);
    await mail(`${TITLE}: contract signed by ${signer}`, { Name: signer, Contract: fileName, "Signed contract": data.url });
    $("sent").hidden = false;
  } catch (err) {
    console.error("[CONTRACT] not sent:", err);
    $("sendError").textContent = `Not sent: ${err.message || "no connection"}. Try again.`;
  } finally {
    btn.disabled = false; btn.textContent = "Send";
  }
});
$("sentClose").addEventListener("click", () => { $("sent").hidden = true; });

/** One email through Web3Forms (the key is in /config.js). Debug prints in the console, tagged [MAIL]. */
async function mail(subject, lines) {
  if (!WEB3FORMS_KEY) throw new Error("sending is not set up (the Web3Forms key is missing in config.js)");
  const form = new FormData();
  form.append("access_key", WEB3FORMS_KEY);
  form.append("subject", subject);
  form.append("from_name", TITLE);
  for (const [k, v] of Object.entries(lines)) form.append(k, v);
  console.log("[MAIL] sending:", subject);
  const res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body: form });
  const data = await res.json().catch(() => ({}));
  console.log("[MAIL] answer:", res.status, data);
  if (!res.ok || !data.success) throw new Error(data.message || `The mail service answered ${res.status}.`);
}
