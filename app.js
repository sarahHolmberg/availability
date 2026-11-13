// The main page is the road: the steps to the dance meet and where everyone is on it (from config.js).
// The side pane holds the calendar: who is available, and with a code you set your own days; Send emails them (Web3Forms).
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
PEOPLE.forEach((p, i) => {
  p.list = listDays(p.days);
  p.colour = `var(--p${i % 5})`;
  p.done = Math.min(STEPS.length, Math.max(Number(p.done) || 0, p.list.length ? 1 : 0)); // days shown = step 1 finished
});

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

// ------------------------------ The road (main page) ------------------------------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Where is "now" on the road? With a code: your own stop. Just looking: the stop with the most people (the furthest, if equal). */
function nowAt() {
  if (me) return me.done;
  let best = 0, most = 0;
  for (let i = 0; i <= STEPS.length; i++) {
    const n = PEOPLE.filter((p) => p.done === i).length;
    if (n && n >= most) { most = n; best = i; }
  }
  return best;
}
const allStops = () => [{ icon: "🚩", title: "Start", text: "Show the days you are free to set off.",
  more: "Everybody starts here. Open the 📅 Days tab, type your code and paint the days you are free: that takes you to step 1." }, ...STEPS];
const stepName = (i) => (i ? `Step ${i} of ${STEPS.length}` : "Start");

/** The stops of the road. Passed stops get a tick, the stop we are at NOW is the big green one, the rest is still grey. */
function drawMap() {
  const map = $("map"), now = nowAt(), stops = allStops();
  map.textContent = "";
  $("sub").textContent = !me ? "The road to the day, and where everyone is on it."
    : me.done >= STEPS.length ? `Hi ${me.name}. You have finished every step.`
    : `Hi ${me.name}. Your next step: ${STEPS[me.done].title}.`;

  // The card at the top: where we are now, and a bar with one piece per step
  const card = $("now");
  card.textContent = "";
  card.append(el("span", "nowLabel", me ? "📍 You are here" : "📍 We are here"), el("b", "", `${stepName(now)}: ${stops[now].title}`));
  const bar = el("span", "nowBar");
  STEPS.forEach((_, i) => bar.append(el("i", i < now ? "full" : "")));
  card.append(bar);
  card.onclick = () => map.children[now].scrollIntoView({ behavior: "smooth", block: "center" });

  stops.forEach((s, i) => {
    const here = PEOPLE.filter((p) => p.done === i);
    const row = el("li", "stop " + (i % 2 ? "right" : "left") + (i < now ? " passed" : i === now ? " now" : ""));
    const btn = el("button"); btn.type = "button";
    btn.addEventListener("click", () => info(i));
    const pin = el("span", "pin", s.icon);
    const body = el("span", "about");
    body.append(el("span", "nr", i === now ? (me ? "📍 You are here" : "📍 We are here") : i < now ? `✓ ${stepName(i)}` : stepName(i)),
      el("b", "name", s.title), el("span", "what", s.text));
    if (here.length) {
      const who = el("span", "here");
      for (const p of here) {
        const chip = el("span", "chip" + (p === me ? " me" : ""));
        chip.style.setProperty("--c", p.colour);
        chip.append(el("i"), p === me ? `${p.name} (you)` : p.name);
        who.append(chip);
      }
      body.append(who);
    }
    body.append(el("span", "moreLink", "More ›"));
    btn.append(pin, body);
    row.append(btn);
    map.append(row);
  });
  drawRoad(now);
  if (shownStep !== null) info(shownStep); // the step window is open: bring it up to date
}

// ------------------------------ More about a step (tap a step) ------------------------------
let shownStep = null; // the step whose window is open, or null
function info(i) {
  shownStep = i;
  const s = allStops()[i], now = nowAt(), box = $("infoCard");
  box.textContent = "";
  const here = PEOPLE.filter((p) => p.done === i);
  box.append(el("div", "bigIcon", s.icon), el("p", "nr", stepName(i)), el("h2", "", s.title),
    el("p", "state " + (i < now ? "passed" : i === now ? "now" : ""), i < now ? "✓ Done" : i === now ? (me ? "📍 You are here" : "📍 We are here") : "Still to come"),
    el("p", "", s.more || s.text));
  if (here.length) box.append(el("p", "soft", `Here now: ${here.map((p) => (p === me ? "you" : p.name)).join(", ")}`));
  if (s.food) box.append(foodForm(s));
  const close = el("button", "link", "Close"); close.type = "button";
  close.addEventListener("click", closeInfo);
  box.append(close);
  $("info").hidden = false;
}
function closeInfo() { shownStep = null; $("info").hidden = true; }
$("info").addEventListener("click", (e) => { if (e.target === $("info")) closeInfo(); });

/** The food step: tick the places, write the usual order and the favourite soda, and Send emails it. Needs your code. */
function foodForm(step) {
  const form = el("form", "food");
  if (!me) {
    const b = el("button", "primary", "Type your code to answer"); b.type = "button";
    b.addEventListener("click", askCode);
    form.append(b);
    return form;
  }
  const saveKey = "availability.food." + me.code.toUpperCase();
  let saved = {};
  try { saved = JSON.parse(store.get(saveKey)) || {}; } catch {}
  const ticked = new Set(saved.places || []);
  const places = el("div", "places");
  for (const name of step.food) {
    const b = el("button", "", name); b.type = "button";
    b.setAttribute("aria-pressed", ticked.has(name));
    b.addEventListener("click", () => { ticked.has(name) ? ticked.delete(name) : ticked.add(name); b.setAttribute("aria-pressed", ticked.has(name)); });
    places.append(b);
  }
  const field = (label, value, hint) => {
    const l = el("label"), input = el("input");
    input.value = value || ""; input.placeholder = hint; input.maxLength = 200;
    l.append(el("span", "", label), input);
    form.append(l);
    return input;
  };
  form.append(el("p", "q", "Where do you eat? Tick all that fit."), places);
  const order = field("What do you usually order there?", saved.order, "e.g. cheeseburger meal, no onion");
  const soda = field("Your favourite soda", saved.soda, "e.g. Fanta");
  const msg = el("p", "error"), send = el("button", "primary", "Send my food preference");
  send.type = "submit";
  form.append(msg, send);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "error";
    if (!ticked.size && !order.value.trim() && !soda.value.trim()) { msg.textContent = "Tick a place or write something first."; return; }
    const answer = { places: [...ticked], order: order.value.trim(), soda: soda.value.trim() };
    store.set(saveKey, JSON.stringify(answer));
    send.disabled = true; send.textContent = "Sending…"; msg.textContent = "";
    try {
      await mail(`${TITLE}: food preference of ${me.name}`, {
        "Eats at": answer.places.join(", ") || "(nothing ticked)",
        "Usual order": answer.order || "(not written)",
        "Favourite soda": answer.soda || "(not written)",
      });
      msg.className = "ok"; msg.textContent = "✓ Sent. Thank you!";
    } catch (err) {
      msg.textContent = `Not sent: ${err.message || "no connection"}. Try again.`;
    } finally {
      send.disabled = false; send.textContent = "Send my food preference";
    }
  });
  return form;
}

/** The line that joins the stops: it winds from circle to circle, solid green as far as upTo, dotted after that. */
function drawRoad(upTo) {
  const map = $("map"), road = $("road"), box = map.getBoundingClientRect();
  const at = [...map.querySelectorAll(".pin")].map((p) => { const r = p.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
  const line = (pts) => pts.map(([x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = pts[i - 1], mid = (py + y) / 2;
    return `C${px} ${mid} ${x} ${mid} ${x} ${y}`;
  }).join(" ");
  road.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  road.querySelector(".todo").setAttribute("d", line(at));
  road.querySelector(".gone").setAttribute("d", line(at.slice(0, upTo + 1)));
}
addEventListener("resize", () => drawMap());

// ------------------------------ The side pane ------------------------------
function pane(open) {
  document.body.classList.toggle("paneOpen", open);
  $("pane").inert = !open;
  $("tab").setAttribute("aria-expanded", open);
  if (open) $("paneClose").focus({ preventScroll: true });
}
$("tab").addEventListener("click", () => pane(!document.body.classList.contains("paneOpen")));
$("paneClose").addEventListener("click", () => pane(false));
$("shade").addEventListener("click", () => pane(false));

// ------------------------------ The calendar (in the side pane) ------------------------------
function draw() {
  drawMap();
  const others = PEOPLE.filter((p) => p !== me);
  document.body.classList.toggle("editing", !!me);
  $("hello").textContent = me ? `Hi ${me.name}, paint your days` : "Who is free, and when";
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

function askCode() { $("gate").hidden = false; $("gateError").textContent = ""; $("code").value = ""; $("code").focus(); }
$("join").addEventListener("click", askCode);
$("gateClose").addEventListener("click", () => { $("gate").hidden = true; });
$("gate").addEventListener("click", (e) => { if (e.target === $("gate")) $("gate").hidden = true; });
addEventListener("keydown", (e) => { // Escape closes the window on top: first the code window, then the side pane
  if (e.key !== "Escape") return;
  if (!$("gate").hidden) $("gate").hidden = true; else if (shownStep !== null) closeInfo(); else if ($("done").hidden) pane(false);
});

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
/** Send one email through Web3Forms: a subject and the lines { label: text }. Throws (with the reason) when it is not sent.
 *  Debug prints (browser console, F12): every step of the sending, tagged [MAIL]. The key is shown shortened. */
async function mail(subject, lines) {
  if (!WEB3FORMS_KEY) { console.warn("[MAIL] NOT SENT: the Web3Forms key is missing (config.js)."); throw new Error("sending is not set up yet (the Web3Forms key is missing in config.js)"); }
  const form = new FormData();
  form.append("access_key", WEB3FORMS_KEY);
  form.append("subject", subject);
  form.append("from_name", TITLE);
  form.append("Name", me.name);
  form.append("Code", me.code);
  for (const [label, text] of Object.entries(lines)) form.append(label, text);
  const shown = Object.fromEntries(form);
  shown.access_key = WEB3FORMS_KEY.slice(0, 8) + "…";
  console.log("[MAIL] 1. Sending to", WEB3FORMS_URL, "at", new Date().toLocaleTimeString());
  console.log("[MAIL] 2. What is sent:", shown);
  const started = performance.now();
  try {
    const res = await fetch(WEB3FORMS_URL, { method: "POST", headers: { Accept: "application/json" }, body: form });
    console.log(`[MAIL] 3. The mail service answered: ${res.status} ${res.statusText} after ${Math.round(performance.now() - started)} ms`);
    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { console.warn("[MAIL] The answer is not JSON:", raw.slice(0, 300)); }
    console.log("[MAIL] 4. Its answer:", data);
    if (!res.ok || !data.success) throw new Error(data.message || `The mail service answered ${res.status}.`);
    console.log("[MAIL] 5. SENT ✓ The mail service accepted it. Check the inbox (and the spam folder).");
  } catch (err) {
    console.error("[MAIL] NOT SENT ✗", err.message || err, navigator.onLine ? "" : "(this device is offline)");
    throw err;
  }
}

$("send").addEventListener("click", async () => {
  if (!me) return;
  const btn = $("send"), n = picked.size;
  btn.disabled = true; btn.textContent = "Sending…"; $("sendError").textContent = "";
  const note = $("note").value.trim();
  const lines = { Available: n ? inWords(picked, true) : "No days (everything removed)" };
  if (note) lines.Note = note;
  if (n) lines["All days"] = [...picked].sort().join(", ");
  try {
    await mail(`${TITLE}: ${me.name} (${n} ${n === 1 ? "day" : "days"})`, lines);
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
pane(false);
if (back) open(back); else draw();
