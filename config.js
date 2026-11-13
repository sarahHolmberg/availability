// ============================== SETTINGS: CHANGE HERE ==============================

// The Web3Forms access key (free at https://web3forms.com: type the email address that should receive the
// availability, and the key arrives in that inbox). Every Send goes to that address.
const WEB3FORMS_KEY = "2fd09af2-d997-42d9-ae86-189446376e29";

// The months on the page: "year-month".
const MONTHS_SHOWN = ["2026-12", "2027-01"];

// The people. Everyone who opens the page sees the names, where each one is on the road, and the days listed here.
//   code: what the person types to set their own days (capitals do not matter). This file is public, so a code
//         keeps strangers out but is not a secret.
//   days: the days everyone sees for this person. One day "2026-12-10", or a row of days "2026-12-10 to 2026-12-13".
//         When someone sends new days you get an email: put those days here to show them to everyone.
//   done: how many steps of the road (STEPS below) this person has finished: 0 = none, 1 = the first, 2 = the first two...
//         Somebody with days listed here has always finished step 1, so you only write done from step 2 on.
const PEOPLE = [
  { name: "amelicgr",         code: "amelicgr",         done: 0, days: [] },
  { name: "bisaje_navarrete", code: "bisaje_navarrete", done: 1, days: ["2026-12-11 to 2026-12-13", "2027-01-15 to 2027-01-17"] },
  { name: "maawan_",          code: "maawan_",          done: 1, days: ["2026-12-10 to 2026-12-13", "2027-01-14 to 2027-01-16"] },
];

// The road on the main page: the steps, in order. icon = the picture in the circle, title = the short name,
// text = one sentence about it.
const STEPS = [
  { icon: "📅", title: "Days shown",          text: "You have shown the days you are free." },
  { icon: "📝", title: "The day explained",   text: "What is going to happen on the day has been explained to you." },
  { icon: "📞", title: "Video call",          text: "We spoke on a video call about the dance meet and answered all your questions." },
  { icon: "💸", title: "25% paid",            text: "You got 25% of the money you get for the day." },
  { icon: "🎫", title: "Tickets bought",      text: "Your tickets to the town where the dance takes place are bought." },
  { icon: "🎥", title: "Videographer booked", text: "The videographer for the day is booked." },
  { icon: "🤝", title: "Everybody agreed",    text: "Everybody agrees on what will happen and on the dates to be there." },
];

// The title at the top of the page and in the email subject.
const TITLE = "Dance meet";
