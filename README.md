# :fouR

The :fouR website, in the :fouR look (black, white, heavy letters; `logo.png` and `favicon.png`).

**The website: https://colon-four.netlify.app/** (Netlify deploys this repository by itself after every push to `main`.)

| Address | What it is | Files |
|---|---|---|
| `/` | The landing page: the logo, big, with three white labels (roadmap, contracts, invoices) that link to the pages, and the contact address (colonfour@proton.me) bottom right | `index.html` |
| `/roadmap/` | The road to the dance meet and the available days | `roadmap/`, `config.js` |
| `/contract-signer/` (also `/contracts`) | Upload a contract (PDF), sign it with your finger, send it | `contract-signer/` |
| `/about/` (also `/about-us`) | About us: who we are, our question, until 2028 (linked bottom left on the landing page) | `about/index.html` |
| `/invoices/` (also `/invoice`) | How we handle invoices for our dancers (one sentence for now) | `invoices/index.html` |

The old GitHub address shows "Redirecting you to colon-four.netlify.app/roadmap", counts down 5 seconds and goes
there (`redirect.js`). GitHub Pages must stay switched on for that.

## The contract signer (/contract-signer/)

1. **Upload contract** (a PDF, at most 4.5 MB). It shows below; the bar with the file name folds it away and back.
2. **✍️ Sign**: a window with your name and a white box: sign with your finger (or mouse), **Done**.
3. The signature lands on the signature line. **Tap anywhere on the contract to move it.**
4. **Send**: the signed PDF is stored and **the link is emailed** to you (Web3Forms, like everything else). The signer
   can also download it. Under the signature the PDF gets the name and the date and time, small.

**Where the signature lands**, without you doing anything: the page looks in the PDF for, in this order:
1. **`[sign]`** written in the document: the signature goes exactly there, and covers the tag. *(Most exact: type
   `[sign]` where the signature should go before you make the PDF.)*
2. a signature field made in the PDF;
3. the word **Signature** (or "Sign here", "Signed by"): right after it, on that line;
4. a line of underscores `______`.

When there are several, the **last** one in the document is used (usually the signer's block). Nothing found: the page
asks to tap the spot.

The signed contracts are kept in **Netlify Blobs** (store `contracts`); a link only works with its long random code.
Anyone with the page can upload, so keep the page's address to the people who need it.

# The roadmap (/roadmap/)

## What the page does

- **The main page is the road**: first the steps the dancer does (days shown, book the video call, games, food
  preference, video call, everybody agreed), then ours (tickets bought, videographer booked); at each stop, the people
  who are there now. What the dancer does moves them on by itself; the video call, tickets and videographer you move
  with − and + in the organiser's window.
  The stop you are at is the big white one (also named in the card at the top); passed stops have a tick.
  No explanations on the page: those are given in the video call.
- **Scrolling pans along the road**: the step in the middle of the screen is full size, the others smaller and fainter,
  and the page settles gently on the nearest step. When the page opens, it pans to the step you are at.
- **The songs** picked to dance to: their album covers peek out at the bottom left, half off the screen, with the
  song and artist under them. With two or more they take turns in front (every 4 seconds). Tap to slide the front
  cover out whole; tap again to tuck it back. **Add a song:** put a square picture in `roadmap/albums/` and a line in
  `ALBUMS` in `config.js`.
- **Tap a step** to see who is there. The dancer's steps (needs their username):
  **Book the video call** (one of the times you set, or they write one; a booked time is greyed for others),
  **Games** (bowling, billiards, darts, or another game), **Food preference** (Max, McDonald's, Burger King, kebab;
  usual order; favourite soda), and **Everybody agreed**: an **I agree** button, once they have had the video call.
  Everyone who agreed is shown on that step with a ✓.
- **The 📅 Days tab** on the right edge slides the side pane in (and out again). In it: December and January, a
  coloured dot on each day somebody is free (one colour per person), and each person's days in words.
- **Anyone can paint days** in the pane: **swipe sideways** across days to paint them, swipe over painted days to
  remove them, or **tap a weekday** (Mon, Tue, ...) for its whole column.
- **Send asks for a username**, and that username is the **code**: it must be in the database. A name that is not is
  refused and nothing is saved. With a name on the list, the days are saved, everyone sees them at once, and "You" on
  the road becomes that username.

## The database (Netlify)

- The people are in the **database**: their username, their days, how many steps they have finished, their games
  and food answers, and their note. The page reads it every time it loads, so everyone always sees the same.
- Every Send is saved in the database **and** emailed to you as a copy (Web3Forms).
- The first time the site runs, the database is filled with the three people that were in the old `data.json`
  (`netlify/shared/tables.mjs`). After that, the database is what counts.
- **Hidden people:** `bisaje_navarrete` is never shown to guests (anyone who has not typed a username) nor to the
  username `navarrete_aiide`: not on the road, the calendar or the agree step. The server leaves them out, so they are
  not in the page at all. Everybody else who typed their username sees them as usual. Change the lists in `HIDDEN` in
  `netlify/functions/road.mjs`.
- People who have not started (no days, step 0) are not shown to others, and their usernames are never sent to
  visitors.

### The organiser's window (secret)

Open the 📅 Days pane and **keep any Sunday pressed for 5 seconds**. Type the organiser key. Then you can:

- see everybody, with their days, games and food answers, and note;
- move somebody along the road with **−** and **+** (always one step from where they are now);
- set the **video call times** people can book (add a date and time, × to take one away);
- **add** a username (so that person can send), or **remove** one.

**The organiser key: set it once in Netlify.** Site configuration → Environment variables → add `ADMIN_KEY` with a
secret of your own → then Deploys → Trigger deploy. Without it the organiser's window stays closed.

## Settings

- `config.js`: `WEB3FORMS_KEY` (where the email copies go), `MONTHS_SHOWN` (the months on the calendar), `HOME_URL`
  and `REDIRECT_SECONDS` (the redirect from the old address), `STEPS` (the steps of the road: picture, name, and the
  questions of the games and food steps), `TITLE`. If the steps move, change `STEP` in
  `netlify/functions/road.mjs` too.
- `netlify/functions/road.mjs`: the function behind `/api` (reads and saves the people).
- `netlify/functions/contract.mjs`: the function behind `/api/contract` (stores and hands out signed contracts).
- `contract-signer/lib/`: the PDF tools (pdf.js to show a PDF, pdf-lib to write the signature in), kept here so the page needs no other website.
- `netlify.toml`: tells Netlify where the page and the function are.

## Testing a change before it goes live (local preview)

```bash
npm install
```

```bash
npm run preview
```

Opens the whole site on http://localhost:8888 with the real function but a **test database** that starts fresh every
time. Nothing touches the live site. Organiser key in the preview: `test`. To see the redirect screen, add `?away=1`
to the address. Signed contracts are kept in memory there too.
