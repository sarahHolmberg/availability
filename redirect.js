// The old address (GitHub Pages): show "Redirecting you to ..." with the seconds counting down, then go to the
// website on Netlify. On the Netlify address this file does nothing. It needs no other file (styles included),
// because on the old address the other files may not be found.
// To see it without going to the old address: add ?away=1 to the address.
(() => {
  const SITE = "https://colon-four.netlify.app"; // CHANGE HERE: the new address
  const SECONDS = 5;                            // CHANGE HERE: how long the countdown lasts
  if (!/\.github\.io$/i.test(location.hostname) && !new URLSearchParams(location.search).has("away")) return;
  window.AWAY = true; // tells the page's own code not to start

  // Where to: the same page on the new address. The old address was the roadmap, so its front page goes to /roadmap/.
  const path = location.pathname.replace(/^\/availability/i, "");
  const to = SITE + (/contract-signer/.test(path) ? "/contract-signer/" : "/roadmap/") + location.hash;
  let left = SECONDS;
  const css = document.createElement("style");
  css.textContent = `
    .away { position: fixed; inset: 0; z-index: 99; background: #000; color: #fff; display: grid; place-content: center;
      justify-items: center; gap: 10px; padding: 24px; text-align: center; font: 16px/1.45 Poppins, system-ui, sans-serif; }
    .away h1 { font-size: 64px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin: 0 0 18px; }
    .away p { margin: 0; color: #9b9b9b; }
    .away .to { color: #fff; font-size: 22px; font-weight: 700; overflow-wrap: anywhere; }
    .away .left { display: grid; place-items: center; width: 84px; height: 84px; margin: 14px auto; border-radius: 50%;
      border: 4px solid #fff; font-size: 36px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .away .go { background: #fff; color: #000; font-weight: 700; font-size: 17px; padding: 12px 22px; border-radius: 14px;
      text-decoration: none; }`;
  document.head.append(css);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="away">
      <h1>:fouR</h1>
      <p>Redirecting you to</p>
      <a class="to" href="${to}">${to.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
      <b class="left" id="awayLeft">${left}</b>
      <a class="go" href="${to}">Go now</a>
    </div>`);
  console.log("[REDIRECT] the old address: going to", to, "in", left, "seconds");
  const tick = setInterval(() => {
    left--;
    document.getElementById("awayLeft").textContent = Math.max(left, 0);
    if (left <= 0) { clearInterval(tick); location.replace(to); }
  }, 1000);
})();
