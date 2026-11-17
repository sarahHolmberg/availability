# :fouR: the road to the dance meet, and the available days

A small phone-first page for the dance meet, in the :fouR look (black, white, heavy letters; `logo.png` and `favicon.png`).

**The website: https://colon-four.netlify.app/** (Netlify deploys this repository by itself after every push to `main`.)
The old GitHub address shows "Redirecting you to colon-four.netlify.app", counts down 5 seconds and goes there.

## What the page does

- **The main page is the road**: the steps to the day (days shown, games, the day explained, video call, food
  preference, tickets bought, videographer booked, everybody agreed) and, at each stop, the people who are there now.
  The stop you are at is the big white one (also named in the card at the top); passed stops have a tick.
  No explanations on the page: those are given in the video call.
- **Scrolling pans along the road**: the step in the middle of the screen is full size, the others smaller and fainter,
  and the page settles gently on the nearest step. When the page opens, it pans to the step you are at.
- **Tap a step** to see who is there. Two steps have questions (needs the person's username):
  **Games** (bowling, billiards, darts, or another game; answering it moves the person onto that step) and
  **Food preference** (Max, McDonald's, Burger King, kebab; usual order; favourite soda).
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
- People who have not started (no days, step 0) are not shown to others, and their usernames are never sent to
  visitors.

### The organiser's window (secret)

Open the 📅 Days pane and **keep any Sunday pressed for 5 seconds**. Type the organiser key. Then you can:

- see everybody, with their days, games and food answers, and note;
- move somebody along the road with **−** and **+**;
- **add** a username (so that person can send), or **remove** one.

**The organiser key: set it once in Netlify.** Site configuration → Environment variables → add `ADMIN_KEY` with a
secret of your own → then Deploys → Trigger deploy. Without it the organiser's window stays closed.

## Settings

- `config.js`: `WEB3FORMS_KEY` (where the email copies go), `MONTHS_SHOWN` (the months on the calendar), `HOME_URL`
  and `REDIRECT_SECONDS` (the redirect from the old address), `STEPS` (the steps of the road: picture, name, and the
  questions of the games and food steps), `TITLE`. If the games step moves, change `GAMES_STEP` in
  `netlify/functions/road.mjs` too.
- `netlify/functions/road.mjs`: the function behind `/api` (reads and saves the people).
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
to the address.
