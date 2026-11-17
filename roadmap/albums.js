// The album covers of the songs picked to dance to (ALBUMS in config.js), peeking out at the bottom left of the
// roadmap, half off the screen. With two or more, every few seconds the front one slips behind and the next comes
// in front. Tap the stack: the front cover slides out whole (and stops turning); tap again to tuck it back.
(() => {
  if (window.AWAY || typeof ALBUMS === "undefined" || !ALBUMS.length) return;
  const EVERY = 4000; // CHANGE HERE: how long each cover stays in front (ms)
  const box = document.getElementById("albums"), stack = box.querySelector(".stack"), caption = box.querySelector(".caption");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cards = ALBUMS.map((a, i) => {
    const img = new Image();
    img.src = a.image; img.alt = `${a.artist} – ${a.title}`; img.decoding = "async"; img.draggable = false;
    img.className = "cover";
    stack.append(img);
    return img;
  });
  let order = cards.map((_, i) => i); // order[0] is in front

  function lay() {
    order.forEach((n, depth) => { cards[n].dataset.depth = Math.min(depth, 3); cards[n].style.zIndex = 10 - depth; });
    const a = ALBUMS[order[0]];
    caption.classList.remove("show");
    requestAnimationFrame(() => {
      caption.querySelector("b").textContent = a.title;
      caption.querySelector("span").textContent = a.artist;
      caption.classList.add("show");
    });
    box.setAttribute("aria-label", `Song: ${a.artist} – ${a.title}`);
  }

  function next() {
    if (cards.length < 2 || box.classList.contains("out")) return;
    const front = cards[order[0]];
    front.classList.add("leaving");                 // slides away to the left...
    setTimeout(() => {
      order.push(order.shift());                    // ...and goes to the back
      front.classList.remove("leaving");
      lay();
    }, calm ? 0 : 380);
  }

  lay();
  let timer = setInterval(next, EVERY);
  document.addEventListener("visibilitychange", () => { clearInterval(timer); if (!document.hidden) timer = setInterval(next, EVERY); });

  // Tap: slide out whole / tuck back. A tap anywhere else tucks it back too.
  box.addEventListener("click", (e) => { e.stopPropagation(); box.classList.toggle("out"); });
  document.addEventListener("click", () => box.classList.remove("out"));
})();
