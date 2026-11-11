# Availability

A small phone-first page that shows who is available on which days, and lets people add their own.

- **Everyone** who opens the page sees the months, a coloured dot on each day somebody is available, and each person's
  days in words at the top.
- **With a code** (button at the bottom) a person sets their own days: **swipe sideways** across days to paint them, swipe over
  painted days to remove them, or **tap a weekday** (Mon, Tue, ...) for its whole column. **Send** emails the days to
  you (through Web3Forms, free, no server).
- The page has no database. So after an email arrives, **put those days in `config.js`** to show them to everyone.
  Until then the person sees their own days only on their own phone.

## Settings: `config.js`

- `WEB3FORMS_KEY`: the key from https://web3forms.com; the emails go to the address the key was made for.
- `MONTHS_SHOWN`: the months on the page, e.g. `["2026-12", "2027-01"]`.
- `PEOPLE`: one line per person: `{ name: "Anna", code: "ANNA", days: ["2026-12-10 to 2026-12-13", "2027-01-05"] },`.
  The file is public, so a code keeps strangers out but is not a secret.

## Putting it online (GitHub Pages)

In the repository on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main, folder / (root) → Save**.
After a minute the page is at `https://<your-username>.github.io/<repository-name>/`.
