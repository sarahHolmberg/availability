// The availability page: code -> calendar -> email (Web3Forms). Settings are in config.js.
const $ = (id) => document.getElementById(id);
const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Small helpers. A day is kept as text "2026-11-16", so it sorts and saves easily.
const pad = (n) => String(n).padStart(2, "0");
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const now = new Date();
const TODAY = key(now.getFullYear(), now.getMonth(), now.getDate());
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

let person = null;        // { code, name }
let picked = new Set();   // the chosen days
let shown = 0;            // which month is on screen: 0 = this month, 1 = next month, ...

// ------------------------------ 1. The code ------------------------------
const findPerson = (text) => {
  const code = text.trim().toUpperCase();
  return code ? PEOPLE.find((p) => p.code.trim().toUpperCase() === code) : null;
};

function open(p) {
  person = p;
  store.set("availability.code", p.code);
  let saved = [];
  try { saved = JSON.parse(store.get("availability.days." + p.code.toUpperCase()) || "[]"); } catch {}
  picked = new Set(saved.filter((d) => d >= TODAY)); // days that have passed fall away
  $("note").value = "";
  $("who").textContent = p.name;
  $("gate").hidden = true; $("done").hidden = true;
  $("app").hidden = false; $("bar").hidden = false;
  shown = 0;
  draw();
}

$("gateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = findPerson($("code").value);
  if (p) return open(p);
  $("gateError").textContent = $("code").value.trim() ? "That code is not known. Check it and try again." : "Type your code first.";
  $("code").classList.remove("shake"); void $("code").offsetWidth; $("code").classList.add("shake");
  $("code").select();
});

$("leave").addEventListener("click", () => {
  store.del("availability.code");
  person = null;
  $("app").hidden = true; $("bar").hidden = true; $("gate").hidden = false;
  $("code").value = ""; $("gateError").textContent = ""; $("code").focus();
});

// ------------------------------ 2. The calendar ------------------------------
function draw() {
  const first = new Date(now.getFullYear(), now.getMonth() + shown, 1);
  const y = first.getFullYear(), m = first.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7; // the week starts on Monday

  $("monthName").textContent = `${MONTHS[m]} ${y}`;
  $("prev").disabled = shown === 0;
  $("next").disabled = shown >= MONTHS_AHEAD;

  const grid = $("grid");
  grid.textContent = "";
  for (let i = 0; i < blanks; i++) grid.append(document.createElement("span"));
  for (let d = 1; d <= days; d++) {
    const k = key(y, m, d);
    const cell = document.createElement("div");
    cell.className = "day" + (k < TODAY ? " past" : "") + (k === TODAY ? " today" : "") + (picked.has(k) ? " on" : "");
    cell.textContent = d;
    cell.dataset.day = k;
    cell.setAttribute("role", "gridcell");
    if (k >= TODAY) {
      cell.tabIndex = 0;
      cell.setAttribute("aria-selected", picked.has(k));
      cell.setAttribute("aria-label", `${d} ${MONTHS[m]}`);
    }
    grid.append(cell);
  }
  count();
}

function count() {
  $("count").textContent = picked.size;
  $("countLabel").textContent = picked.size === 1 ? "day" : "days";
  $("send").disabled = picked.size === 0;
  $("clear").hidden = picked.size === 0;
  $("sendError").textContent = "";
  if (person) store.set("availability.days." + person.code.toUpperCase(), JSON.stringify([...picked].sort()));
}

/** Switch one day on or off (on = true/false). Days that have passed cannot be chosen. */
function set(cell, on) {
  const k = cell?.dataset?.day;
  if (!k || k < TODAY || picked.has(k) === on) return;
  on ? picked.add(k) : picked.delete(k);
  cell.classList.toggle("on", on);
  cell.setAttribute("aria-selected", on);
  if (navigator.vibrate) navigator.vibrate(8);
  count();
}

// Painting: the first day you touch decides (was it off? then you paint days ON; was it on? then you wipe them OFF),
// and every day your finger passes gets the same.
let painting = null; // null = not painting, true = switching on, false = switching off
const dayAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".day");
$("grid").addEventListener("pointerdown", (e) => {
  const cell = dayAt(e);
  if (!cell || cell.classList.contains("past")) return;
  e.preventDefault();
  painting = !picked.has(cell.dataset.day);
  set(cell, painting);
});
addEventListener("pointermove", (e) => { if (painting !== null) set(dayAt(e), painting); });
addEventListener("pointerup", () => { painting = null; });
addEventListener("pointercancel", () => { painting = null; });
$("grid").addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && e.target.dataset.day) { e.preventDefault(); set(e.target, !picked.has(e.target.dataset.day)); }
});

// A weekday name takes the whole column: all on, or (if they are all on already) all off.
WEEKDAYS.forEach((name, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = name;
  b.setAttribute("aria-label", `All ${name}s this month`);
  b.addEventListener("click", () => {
    const cells = [...$("grid").children].filter((c, n) => n % 7 === i && c.dataset.day && c.dataset.day >= TODAY);
    const on = !cells.every((c) => picked.has(c.dataset.day));
    cells.forEach((c) => set(c, on));
  });
  $("weekdays").append(b);
});

$("prev").addEventListener("click", () => { if (shown > 0) { shown--; draw(); } });
$("next").addEventListener("click", () => { if (shown < MONTHS_AHEAD) { shown++; draw(); } });
$("clear").addEventListener("click", () => { picked.clear(); draw(); });

// ------------------------------ 3. The email ------------------------------
/** The chosen days as text, one line per month, days in a row joined: "November 2026: 16-20, 24". */
function daysAsText() {
  const months = new Map();
  for (const k of [...picked].sort()) {
    const [y, m, d] = k.split("-").map(Number);
    const name = `${MONTHS[m - 1]} ${y}`;
    if (!months.has(name)) months.set(name, []);
    months.get(name).push(d);
  }
  return [...months].map(([name, ds]) => {
    const runs = [];
    for (const d of ds) {
      const last = runs[runs.length - 1];
      if (last && last[1] === d - 1) last[1] = d; else runs.push([d, d]);
    }
    return `${name}: ${runs.map(([a, b]) => (a === b ? a : `${a}-${b}`)).join(", ")}`;
  }).join("\n");
}

$("send").addEventListener("click", async () => {
  if (!person || !picked.size) return;
  if (!WEB3FORMS_KEY) { $("sendError").textContent = "Sending is not set up yet: the Web3Forms key is missing (config.js)."; return; }
  const btn = $("send");
  btn.disabled = true; btn.textContent = "Sending…"; $("sendError").textContent = "";
  const note = $("note").value.trim();
  const form = new FormData();
  form.append("access_key", WEB3FORMS_KEY);
  form.append("subject", `${TITLE}: ${person.name} (${picked.size} ${picked.size === 1 ? "day" : "days"})`);
  form.append("from_name", TITLE);
  form.append("Name", person.name);
  form.append("Code", person.code);
  form.append("Available", daysAsText());
  if (note) form.append("Note", note);
  form.append("All days", [...picked].sort().join(", "));
  try {
    const res = await fetch(WEB3FORMS_URL, { method: "POST", headers: { Accept: "application/json" }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || `The mail service answered ${res.status}.`);
    $("doneText").textContent = `Thanks ${person.name}. Your ${picked.size} ${picked.size === 1 ? "day has" : "days have"} been sent.`;
    $("app").hidden = true; $("bar").hidden = true; $("done").hidden = false;
  } catch (err) {
    $("sendError").textContent = `Not sent: ${err.message || "no connection"}. Your days are kept; try again.`;
  } finally {
    btn.textContent = "Send"; btn.disabled = picked.size === 0;
  }
});

$("again").addEventListener("click", () => open(person));

// ------------------------------ Start ------------------------------
document.title = TITLE;
$("gateTitle").textContent = TITLE;
const back = findPerson(store.get("availability.code") || ""); // been here before on this phone: straight to the calendar
if (back) open(back); else $("code").focus();
