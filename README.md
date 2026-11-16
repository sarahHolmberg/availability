# :fouR: the road to the dance meet, and the available days

A small phone-first page for the dance meet, in the :fouR look (black, white, heavy letters; `logo.png` and `favicon.png`).

- **The main page is the road**: the steps to the day (days shown, the day explained, video call, food preference, 25% paid, tickets
  bought, videographer booked, everybody agreed) and, at each stop, the people who are there now. The stop we are at
  is the big green one (also named in the card at the top); passed stops have a tick.
- **Tap a step** for more about it. The **food step** asks where a person eats (Max, McDonald's, Burger King, kebab),
  what they usually order and their favourite soda, and emails the answers to you (needs their username).
- **The 📅 Days tab** on the right edge slides the side pane in (and out again). In it: December and January, a
  coloured dot on each day somebody is free (one colour per person), and each person's days in words.
- **Anyone can paint days** in the pane: **swipe sideways** across days to paint them, swipe over painted days to
  remove them, or **tap a weekday** (Mon, Tue, ...) for its whole column.
- **Send asks for a username**, and that username is the **code**: it must be one of the names in `data.json`. A name that is not on the list is refused and nothing is sent. With a name on the list, the days are
  emailed to you (through Web3Forms, free, no server) and "You" on the road becomes that username.

## No database: the file `data.json`

- **`data.json` holds the people**: their username, their days, and how many steps they have finished (`done`).
  The page reads it every time it loads, so what is in the file is what everyone sees.
- The usernames in it are also the **code**: only they can send.
- Everything a person sends (their days, their food answers) comes to you **by email**. Their own browser remembers
  it too, so they move along the road at once; nobody else sees that until it is in the file.
- **Putting an email into the file, the secret window:** open the 📅 Days pane and **keep any Sunday pressed for 5
  seconds**. Paste the **JSON** line of the email(s), press Add, then **Copy the file** and replace `data.json` on
  GitHub with it (the window has the link) and Commit. After about a minute everyone sees it.
- To move somebody along the road, change their `done` in `data.json` (or paste `{"name":"maawan_","done":3}` in the
  secret window). To let a new person in, add a line for them: `{"name":"anna","done":0,"days":[]}`.
- The page cannot write the file by itself: that would need a GitHub password inside a public page.

## Settings: `config.js`

- `WEB3FORMS_KEY`: the key from https://web3forms.com; the emails go to the address the key was made for.
- `MONTHS_SHOWN`: the months on the calendar, e.g. `["2026-12", "2027-01"]`.
- `DATA_EDIT_URL`: the GitHub page where `data.json` is changed (the secret window links to it).
- `STEPS`: the steps of the road, in order (picture, short name, one sentence, and the longer text behind a tap).

## Putting it online (GitHub Pages)

In the repository on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main, folder / (root) → Save**.
After a minute the page is at `https://<your-username>.github.io/<repository-name>/`.
