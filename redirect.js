// The old address (GitHub Pages): show "Redirecting you to ..." with the seconds counting down, then go to the
// website on Netlify (HOME_URL in config.js). On the Netlify address this file does nothing.
// To see it without going to the old address: add ?away=1 to the address.
if (/\.github\.io$/i.test(location.hostname) || new URLSearchParams(location.search).has("away")) {
  window.AWAY = true; // tells app.js not to start
  const to = HOME_URL + location.hash;
  let left = REDIRECT_SECONDS;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="away">
      <h1>${TITLE}</h1>
      <p>Redirecting you to</p>
      <a href="${to}">${HOME_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
      <p class="awayTime"><b id="awayLeft">${left}</b></p>
      <a class="primary" href="${to}">Go now</a>
    </div>`); // on top of the page, which stays empty underneath
  document.title = TITLE;
  console.log("[REDIRECT] the old address: going to", to, "in", left, "seconds");
  const tick = setInterval(() => {
    left--;
    document.getElementById("awayLeft").textContent = Math.max(left, 0);
    if (left <= 0) { clearInterval(tick); location.replace(to); }
  }, 1000);
}
