# Dance meet: the road and the available days

A small phone-first page for the dance meet.

- **The main page is the road**: the steps to the day (days shown, the day explained, video call, food preference, 25% paid, tickets
  bought, videographer booked, everybody agreed) and, at each stop, the people who are there now. The stop we are at
  is the big green one (also named in the card at the top); passed stops have a tick.
- **Tap a step** for more about it. The **food step** asks where a person eats (Max, McDonald's, Burger King, kebab),
  what they usually order and their favourite soda, and emails the answers to you (needs their code).
- **The 📅 Days tab** on the right edge slides the side pane in (and out again). In it: the months, a coloured dot on
  each day somebody is available, and each person's days in words.
- **With a code** (button at the bottom of the pane) a person sets their own days: **swipe sideways** across days to
  paint them, swipe over painted days to remove them, or **tap a weekday** (Mon, Tue, ...) for its whole column.
  **Send** emails the days to you (through Web3Forms, free, no server). The road then shows where they are themselves.
- The page has no database. So after an email arrives, **put those days in `config.js`** to show them to everyone,
  and **change `done`** there when a person finishes a step.

## Settings: `config.js`

- `WEB3FORMS_KEY`: the key from https://web3forms.com; the emails go to the address the key was made for.
- `MONTHS_SHOWN`: the months on the page, e.g. `["2026-12", "2027-01"]`.
- `PEOPLE`: one line per person: `{ name: "Anna", code: "ANNA", done: 2, days: ["2026-12-10 to 2026-12-13", "2027-01-05"] },`.
  `done` = how many steps of the road the person has finished (someone with days listed has always finished step 1).
- `STEPS`: the steps of the road, in order (picture, short name, one sentence, and the longer text behind a tap).
  The file is public, so a code keeps strangers out but is not a secret.

## Putting it online (GitHub Pages)

In the repository on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main, folder / (root) → Save**.
After a minute the page is at `https://<your-username>.github.io/<repository-name>/`.
