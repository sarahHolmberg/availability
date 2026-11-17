// ============================== SETTINGS: CHANGE HERE ==============================

// The Web3Forms access key (free at https://web3forms.com: type the email address that should receive the
// copies, and the key arrives in that inbox). Every Send is saved in the database AND emailed to that address.
const WEB3FORMS_KEY = "2fd09af2-d997-42d9-ae86-189446376e29";

// The months on the calendar: "year-month".
const MONTHS_SHOWN = ["2026-12", "2027-01"];

// THE PEOPLE ARE IN THE DATABASE (Netlify): who is on the road, their days, their step, their food answers.
// Their usernames are also the CODE: only a username that is in the database can send.
// You change them in the organiser's window on the page: open 📅 Days and hold any Sunday for 5 seconds.

// The email address shown on the landing page (bottom right) is in index.html.
// The redirect from the old GitHub address is set in redirect.js.

// The road on the main page: the steps, in order. icon = the picture in the circle, title = its name.
// A step with "form" has questions, answered with a tap on the step (needs the person's username):
//   picks = the choices to tick, pickKey = under which name they are saved, fields = the boxes to write in.
// The answers are saved in the database and emailed to you. Answering the games step moves a person onto it.
const STEPS = [
  { icon: "📅", title: "Days shown" },
  { icon: "🎳", title: "Games",
    form: { key: "games", pickKey: "games", picks: ["Bowling", "Billiards", "Darts"],
            fields: [{ id: "other", label: "Another game", hint: "e.g. table tennis" }] } },
  { icon: "📝", title: "The day explained" },
  { icon: "📞", title: "Video call" },
  { icon: "🍔", title: "Food preference",
    form: { key: "food", pickKey: "places", picks: ["Max", "McDonald's", "Burger King", "Kebab"],
            fields: [{ id: "order", label: "Usual order", hint: "e.g. cheeseburger meal" },
                     { id: "soda", label: "Favourite soda", hint: "e.g. Fanta" }] } },
  { icon: "🎫", title: "Tickets bought" },
  { icon: "🎥", title: "Videographer booked" },
  { icon: "🤝", title: "Everybody agreed" },
];

// The name: the title of the browser tab, the top of the page and the email subject.
const TITLE = ":fouR";
