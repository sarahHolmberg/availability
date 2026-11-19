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

// The road on the main page: the steps, in order. First what the dancer does, then what we do.
//   icon = the picture in the circle, title = its name.
//   form = questions, answered with a tap on the step (needs the person's username):
//     picks = the choices to tick (for the call: the times you set in the organiser's window), pickKey = under which
//     name they are saved, fields = the boxes to write in, one = only one choice.
//   agree = the "I agree" step: everyone who agreed is shown on it.
// What the dancer does moves them on by itself. If the steps move, change STEP in netlify/functions/road.mjs too.
const STEPS = [
  { icon: "📅", title: "Days shown" },
  { icon: "🗓️", title: "Book the video call",
    form: { key: "call", pickKey: "times", picks: "callTimes", one: true,
            fields: [{ id: "other", label: "None of these times? Write one", hint: "e.g. Tuesday after 6 pm" }] } },
  { icon: "🎳", title: "Games",
    form: { key: "games", pickKey: "games", picks: ["Bowling", "Billiards", "Darts"],
            fields: [{ id: "other", label: "Another game", hint: "e.g. table tennis" }] } },
  { icon: "🍔", title: "Food preference",
    form: { key: "food", pickKey: "places", picks: ["Max", "McDonald's", "Burger King", "Kebab"],
            fields: [{ id: "order", label: "Usual order", hint: "e.g. cheeseburger meal" },
                     { id: "soda", label: "Favourite soda", hint: "e.g. Fanta" }] } },
  { icon: "📞", title: "Video call" },
  { icon: "🤝", title: "Everybody agreed", agree: true },
  { icon: "🎫", title: "Tickets bought" },
  { icon: "🎥", title: "Videographer booked" },
];

// The name: the title of the browser tab, the top of the page and the email subject.
const TITLE = ":fouR";

// The songs picked to dance to: the album covers peeking out at the bottom left of the roadmap.
// With two or more they take turns in front. image = a square picture in roadmap/albums/ (about 480 x 480).
const ALBUMS = [
  { image: "/roadmap/albums/odeal-my-heart.jpg", title: "My Heart", artist: "Odeal" },
];
