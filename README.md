# Availability

A small phone-first page where people show which days they are available.

1. They type their **code**.
2. They see the calendar: **swipe** across days to paint them (swipe over painted days to wipe them), or **tap a weekday**
   (Mon, Tue, ...) for that whole column.
3. **Send** emails the days to you (through Web3Forms, free, no server).

The page remembers the code and the days on that phone, so someone can come back and change them.

## Settings: `config.js`

- `WEB3FORMS_KEY`: get it free at https://web3forms.com (type the email that should receive the availability; the key
  arrives in that inbox) and paste it between the quotes. Without it, Send says it is not set up.
- `PEOPLE`: one line per person: `{ code: "ANNA", name: "Anna" },`. The file is public, so a code keeps strangers out but
  is not a secret.
- `MONTHS_AHEAD`: how far ahead people can fill in.

## Putting it online (GitHub Pages)

In the repository on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main, folder / (root) → Save**.
After a minute the page is at `https://<your-username>.github.io/<repository-name>/`.
