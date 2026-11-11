// The availability page. Everyone sees the months and who is available (from config.js). With a code you set your
// own days, and Send emails them (Web3Forms). Settings are in config.js.
const $ = (id) => document.getElementById(id);
const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Small helpers. A day is kept as text "2026-12-10", so it sorts and saves easily.
const pad = (n) => String(n).padStart(2, "0");
const key = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const now = new Date();
const TODAY = key(now.getFullYear(), now.getMonth(), now.getDate());
const inMonths = (k) => MONTHS_SHOWN.includes(k.slice(0, 7));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/** The days of a person in config.js ("2026-12-10" or "2026-12-10 to 2026-12-13") as a list of single days. */
function listDays(days) {
  const out = [];
  for (const item of days || []) {
    const [from, to = from] = String(item).split(/\s*to\s*/).map((s) => s.trim());
    const d = new Date(from + "T12:00:00"), end = new Date(to + "T12:00:00");
    if (isNaN(d) || isNaN(end)) { console.warn("[CONFIG] not a date:", item); continue; }
    for (let n = 0; d <= end && n < 400; d.setDate(d.getDate() + 1), n++) out.push(key(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return out;
}
PEOPLE.forEach((p, i) => { p.list = listDays(p.days); p.colour = `var(--p${i % 5})`; });

/** Days as words: "10-13 Dec, 14-16 Jan" (short), or one line per month for the email. */
function inWords(days, forEmail) {
  const months = new Map();
  for (const k of [...days].sort()) {
    const [y, m, d] = k.split("-").map(Number);
    const name = forEmail ? `${MONTHS[m - 1]} ${y}` : SHORT[m - 1];
    if (!months.has(name)) months.set(name, []);
    const runs = months.get(name), last = runs[runs.length - 1];
    if (last && last[1] === d - 1) last[1] = d; else runs.push([d, d]);
  }
  const text = (runs) => runs.map(([a, b]) => (a === b ? a : `${a}-${b}`)).join(", ");
  return [...months].map(([name, runs]) => (forEmail ? `${name}: ${text(runs)}` : `${text(runs)} ${name}`)).join(forEmail ? "\n" : " · ");
}

let me = null;            // the person whose code was typed (one of PEOPLE), or null = just looking
let picked = new Set();   // my days

// ------------------------------ The page ------------------------------
function draw() {
  const others = PEOPLE.filter((p) => p !== me);
  document.body.classList.toggle("editing", !!me);
  $("hello").textContent = me ? `Hi ${me.name}, paint your days` : "Who is available, and when";
  $("leave").hidden = $("hint").hidden = $("noteBox").hidden = $("barIn").hidden = !me;
  $("barOut").hidden = !!me;

  // Who is on the calendar
  const legend = $("legend");
  legend.textContent = "";
  const row = (colour, name, text, mine) => {
    const li = document.createElement("li"), i = document.createElement("i"), b = document.createElement("b"), s = document.createElement("span");
    li.style.setProperty("--c", colour); if (mine) li.className = "me";
    b.textContent = name; s.textContent = text;
    li.append(i, b, s); legend.append(li);
    return s;
  };
  if (me) row("var(--go)", "You", "", true).id = "myDays";
  for (const p of others) if (p.list.length) row(p.colour, p.name, inWords(p.list));
  if (!legend.children.length) row("var(--line)", "Nobody yet", "Be the first");

  // The months
  const box = $("months");
  box.textContent = "";
  for (const ym of MONTHS_SHOWN) {
    const [y, m] = ym.split("-").map(Number), month = m - 1;
    const first = new Date(y, month, 1), days = new Date(y, month + 1, 0).getDate();
    const sec = document.createElement("section"); sec.className = "month";
    const h = document.createElement("h3"); h.textContent = `${MONTHS[month]} ${y}`;
    const wd = document.createElement("div"); wd.className = "weekdays";
    const grid = document.createElement("div"); grid.className = "grid"; grid.setAttribute("role", "grid");

    // A weekday name takes its whole column in that month: all on, or (if they are all on already) all off.
    WEEKDAYS.forEach((name, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = name; b.disabled = !me;
      if (me) b.setAttribute("aria-label", `All ${name} days in ${MONTHS[month]}`);
      b.addEventListener("click", () => {
        const cells = [...grid.children].filter((c, n) => n % 7 === i && c.dataset.day && c.dataset.day >= TODAY);
        const on = !cells.every((c) => picked.has(c.dataset.day));
        cells.forEach((c) => set(c, on));
      });
      wd.append(b);
    });

    for (let i = (first.getDay() + 6) % 7; i > 0; i--) grid.append(document.createElement("span")); // the week starts on Monday
    for (let d = 1; d <= days; d++) {
      const k = key(y, month, d), who = others.filter((p) => p.list.includes(k));
      const cell = document.createElement("div");
      cell.className = "day" + (k < TODAY ? " past" : "") + (k === TODAY ? " today" : "") + (who.length ? " busy" : "") + (me && picked.has(k) ? " on" : "");
      cell.dataset.day = k;
      cell.setAttribute("role", "gridcell");
      cell.append(String(d));
      let label = `${d} ${MONTHS[month]}`;
      if (who.length) {
        const dots = document.createElement("div"); dots.className = "dots";
        for (const p of who) { const dot = document.createElement("i"); dot.style.setProperty("--c", p.colour); dots.append(dot); }
        cell.append(dots);
        label += `: ${who.map((p) => p.name).join(", ")}`;
      }
      cell.setAttribute("aria-label", label);
      if (me && k >= TODAY) { cell.tabIndex = 0; cell.setAttribute("aria-selected", picked.has(k)); }
      grid.append(cell);
    }
    sec.append(h, wd, grid); box.append(sec);
  }
  count();
}

function count() {
  $("sendError").textContent = "";
  if (!me) return;
  $("count").textContent = picked.size;
  $("countLabel").textContent = picked.size === 1 ? "day" : "days";
  $("clear").hidden = picked.size === 0;
  $("myDays").textContent = picked.size ? inWords(picked) : "No days yet";
  store.set("availability.days." + me.code.toUpperCase(), JSON.stringify([...picked].sort()));
}

/** Switch one of my days on or off (on = true/false). Days that have passed cannot be chosen. */
function set(cell, on) {
  const k = cell?.dataset?.day;
  if (!me || !k || k < TODAY || picked.has(k) === on) return;
  on ? picked.add(k) : picked.delete(k);
  cell.classList.toggle("on", on);
  cell.setAttribute("aria-selected", on);
  if (navigator.vibrate) navigator.vibrate(8);
  count();
}

// Painting: the first day you touch decides (was it off? then you paint days ON; was it on? then you wipe them OFF),
// and every day your finger passes gets the same. Sideways paints; up and down still scrolls the page, and when the
// phone takes a touch as scrolling, the day that touch started on goes back to what it was.
let painting = null;  // null = not painting, true = switching on, false = switching off
let startCell = null; // the day the touch started on
let moved = false;    // did the touch reach a second day?
const dayAt = (e) => document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".day");
$("months").addEventListener("pointerdown", (e) => {
  const cell = dayAt(e);
  if (!me || !cell || cell.classList.contains("past")) return;
  painting = !picked.has(cell.dataset.day);
  startCell = cell; moved = false;
  set(cell, painting);
});
addEventListener("pointermove", (e) => {
  if (painting === null) return;
  const cell = dayAt(e);
  if (cell && cell !== startCell) moved = true;
  set(cell, painting);
});
addEventListener("pointerup", () => { painting = null; });
addEventListener("pointercancel", () => {
  if (painting !== null && !moved) set(startCell, !painting); // it was a scroll, not a tap
  painting = null;
});
$("months").addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && e.target.dataset.day) { e.preventDefault(); set(e.target, !picked.has(e.target.dataset.day)); }
});
$("clear").addEventListener("click", () => { picked.clear(); draw(); });

// ------------------------------ The code ------------------------------
const findPerson = (text) => {
  const code = String(text).trim().toUpperCase();
  return code ? PEOPLE.find((p) => p.code && p.code.trim().toUpperCase() === code) : null;
};

/** Start setting days as this person: the days saved on this phone, or else the days everyone sees for them. */
function open(p) {
  me = p;
  store.set("availability.code", p.code);
  let saved = null;
  try { saved = JSON.parse(store.get("availability.days." + p.code.toUpperCase())); } catch {}
  picked = new Set((Array.isArray(saved) ? saved : p.list).filter((d) => d >= TODAY && inMonths(d)));
  $("note").value = "";
  $("gate").hidden = true; $("done").hidden = true;
  draw();
}

$("join").addEventListener("click", () => {
  $("gate").hidden = false; $("gateError").textContent = ""; $("code").value = ""; $("code").focus();
});
$("gateClose").addEventListener("click", () => { $("gate").hidden = true; });
$("gate").addEventListener("click", (e) => { if (e.target === $("gate")) $("gate").hidden = true; });
addEventListener("keydown", (e) => { if (e.key === "Escape") $("gate").hidden = true; });

$("gateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const p = findPerson($("code").value);
  if (p) return open(p);
  $("gateError").textContent = $("code").value.trim() ? "That code is not known. Check it and try again." : "Type your code first.";
  $("code").classList.remove("shake"); void $("code").offsetWidth; $("code").classList.add("shake");
  $("code").select();
});

$("leave").addEventListener("click", () => { store.del("availability.code"); me = null; picked = new Set(); draw(); });

// ------------------------------ The email ------------------------------
$("send").addEventListener("click", async () => {
  if (!me) return;
  if (!WEB3FORMS_KEY) { $("sendError").textContent = "Sending is not set up yet: the Web3Forms key is missing (config.js)."; return; }
  const btn = $("send"), n = picked.size;
  btn.disabled = true; btn.textContent = "Sending…"; $("sendError").textContent = "";
  const note = $("note").value.trim();
  const form = new FormData();
  form.append("access_key", WEB3FORMS_KEY);
  form.append("subject", `${TITLE}: ${me.name} (${n} ${n === 1 ? "day" : "days"})`);
  form.append("from_name", TITLE);
  form.append("Name", me.name);
  form.append("Code", me.code);
  form.append("Available", n ? inWords(picked, true) : "No days (everything removed)");
  if (note) form.append("Note", note);
  if (n) form.append("All days", [...picked].sort().join(", "));
  try {
    const res = await fetch(WEB3FORMS_URL, { method: "POST", headers: { Accept: "application/json" }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || `The mail service answered ${res.status}.`);
    $("doneText").textContent = n
      ? `Thanks ${me.name}. Your ${n} ${n === 1 ? "day has" : "days have"} been sent. They show for everyone once they are added to the page.`
      : `Thanks ${me.name}. It has been sent that you have no days.`;
    $("done").hidden = false;
  } catch (err) {
    $("sendError").textContent = `Not sent: ${err.message || "no connection"}. Your days are kept; try again.`;
  } finally {
    btn.textContent = "Send"; btn.disabled = false;
  }
});
$("again").addEventListener("click", () => { $("done").hidden = true; });

// ------------------------------ Start ------------------------------
document.title = TITLE;
$("title").textContent = TITLE;
const back = findPerson(store.get("availability.code") || ""); // been here before on this phone: straight to your days
if (back) open(back); else draw();
