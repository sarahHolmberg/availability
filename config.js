// ============================== SETTINGS: CHANGE HERE ==============================

// The Web3Forms access key (free at https://web3forms.com: type the email address that should receive the
// availability, and the key arrives in that inbox). Every Send goes to that address.
const WEB3FORMS_KEY = "2fd09af2-d997-42d9-ae86-189446376e29";

// The months on the page: "year-month".
const MONTHS_SHOWN = ["2026-12", "2027-01"];

// The people. Everyone who opens the page sees the names and the days listed here.
//   code: what the person types to set their own days (capitals do not matter). This file is public, so a code
//         keeps strangers out but is not a secret.
//   days: the days everyone sees for this person. One day "2026-12-10", or a row of days "2026-12-10 to 2026-12-13".
//         When someone sends new days you get an email: put those days here to show them to everyone.
const PEOPLE = [
  { name: "amelicgr",         code: "amelicgr",         days: [] },
  { name: "bisaje_navarrete", code: "bisaje_navarrete", days: [] },
  { name: "maawan_",          code: "maawan_",          days: ["2026-12-10 to 2026-12-13", "2027-01-14 to 2027-01-16"] },
];

// The title at the top of the page and in the email subject.
const TITLE = "Availability";
