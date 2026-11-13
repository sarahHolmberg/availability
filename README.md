# Dance meet: the road and the available days

A small phone-first page for the dance meet.

- **The main page is the road**: the steps to the day (days shown, the day explained, video call, food preference, 25% paid, tickets
  bought, videographer booked, everybody agreed) and, at each stop, the people who are there now. The stop we are at
  is the big green one (also named in the card at the top); passed stops have a tick.
- **Tap a step** for more about it. The **food step** asks where a person eats (Max, McDonald's, Burger King, kebab),
  what they usually order and their favourite soda, and emails the answers to you (needs their username).
- **The 📅 Days tab** on the right edge slides the side pane in (and out again). In it: the months, a coloured dot on
  each day somebody is available, and each person's days in words.
- **Anyone can paint days** in the pane: **swipe sideways** across days to paint them, swipe over painted days to
  remove them, or **tap a weekday** (Mon, Tue, ...) for its whole column.
- **Send asks for a username**, and that username is the **code**: it must be one of the names in `PEOPLE`
  (`config.js`). A name that is not on the list is refused and nothing is sent. With a name on the list, the days are
  emailed to you (through Web3Forms, free, no server) and "You" on the road becomes that username.

## No database: email + this browser's memory

- Everything a person sends (their days, their food answers) comes to you **by email**.
- Before they type their username, a person sees **You** at the start of the road. After they send their days, their
  own browser remembers it (local storage) and shows them on **step 1** straight away, under their username.
- That memory is only in **their** browser. Other visitors do not see it.
- **Read progress** (small link at the bottom of the main page): every email has a line **JSON**. Paste one or more of
  those lines there and the people land on the road where they belong, in **your** browser. You can also write a line
  yourself to move somebody on: `{"name":"maawan_","done":3}` = three steps finished.
- To show somebody's days and step to **everyone**, change that person in `PEOPLE` in `config.js`.

## Settings: `config.js`

- `WEB3FORMS_KEY`: the key from https://web3forms.com; the emails go to the address the key was made for.
- `MONTHS_SHOWN`: the months on the page, e.g. `["2026-12", "2027-01"]`.
- `PEOPLE`: the people, and at the same time the list of usernames that may send. One line per person:
  `{ name: "anna", done: 2, days: ["2026-12-10 to 2026-12-13", "2027-01-05"] },`.
  `done` = how many steps of the road the person has finished (someone with days listed has always finished step 1).
  Someone with `done: 0` and no days has not started and is not shown to others. The file is public, so the usernames
  keep strangers out but are not a secret.
- `STEPS`: the steps of the road, in order (picture, short name, one sentence, and the longer text behind a tap).

## Putting it online (GitHub Pages)

In the repository on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main, folder / (root) → Save**.
After a minute the page is at `https://<your-username>.github.io/<repository-name>/`.
