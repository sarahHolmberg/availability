// ============================== SETTINGS: CHANGE HERE ==============================

// The Web3Forms access key (free at https://web3forms.com: type the email address that should receive the
// copies, and the key arrives in that inbox). Every Send is saved in the database AND emailed to that address.
const WEB3FORMS_KEY = "2fd09af2-d997-42d9-ae86-189446376e29";

// The months on the calendar: "year-month".
const MONTHS_SHOWN = ["2026-12", "2027-01"];

// THE PEOPLE ARE IN THE DATABASE (Netlify): who is on the road, their days, their step, their food answers.
// Their usernames are also the CODE: only a username that is in the database can send.
// You change them in the organiser's window on the page: open 📅 Days and hold any Sunday for 5 seconds.

// The address of the website. Someone who opens the old GitHub address is sent here.
const HOME_URL = "https://colon-four.netlify.app/";
const REDIRECT_SECONDS = 5; // how long the old address shows "Redirecting you to..." first

// The road on the main page: the steps, in order.
//   icon = the picture in the circle, title = the short name, text = one sentence about it,
//   more = the longer explanation a person sees when they tap the step,
//   food = (only for the food step) the places a person can tick; their answers are emailed to you.
const STEPS = [
  { icon: "📅", title: "Days shown", text: "You have shown the days you are free.",
    more: "Open the 📅 Days tab, type your code and paint the days you can come. Press Send. You can change your days later and send again." },
  { icon: "📝", title: "The day explained", text: "What is going to happen on the day has been explained to you.",
    more: "You get the plan for the day: where to be, at what time, what we film and how long it takes." },
  { icon: "📞", title: "Video call", text: "We spoke on a video call about the dance meet and answered all your questions.",
    more: "A short video call where everything about the dance meet is explained once more. Bring every question you have: this is the moment to ask." },
  { icon: "🍔", title: "Food preference", text: "You told us what you like to eat and drink.",
    more: "Do you eat at Max, McDonald's, Burger King, or do you prefer kebab? Tell us what you usually order there and your favourite soda, so the right food is there on the day.",
    food: ["Max", "McDonald's", "Burger King", "Kebab"] },
  { icon: "💸", title: "25% paid", text: "You got 25% of the money you get for the day.",
    more: "A quarter of your money for the day is paid to you before the day. You get the rest on the day itself." },
  { icon: "🎫", title: "Tickets bought", text: "Your tickets to the town where the dance takes place are bought.",
    more: "We buy your tickets to the town where the dance takes place, and you get them from us." },
  { icon: "🎥", title: "Videographer booked", text: "The videographer for the day is booked.",
    more: "The person who films the dance is booked for the dates everybody can come." },
  { icon: "🤝", title: "Everybody agreed", text: "Everybody agrees on what will happen and on the dates to be there.",
    more: "The last step: everybody has said yes to the plan and to the dates. After this, we meet and dance." },
];

// The name: the title of the browser tab, the top of the page and the email subject.
const TITLE = ":fouR";
