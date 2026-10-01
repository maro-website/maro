export function photo(id: string, width = 2000) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const services = [
  {
    id: "strategy",
    name: "Strategy",
    text: "Positioning, narrative, and the few decisions that keep a company from sounding like the rest of its category.",
    image: photo("photo-1460661419201-fd4cecdf8a8b"),
    bg: "#e7ff3d",
    fg: "#141414",
  },
  {
    id: "identity",
    name: "Identity",
    text: "Marks, type, and a voice that still feels like itself on a bottle, a building, or a boarding pass.",
    image: photo("photo-1524504388940-b1c1722653e1"),
    bg: "#f4efe6",
    fg: "#1a1a1a",
  },
  {
    id: "digital",
    name: "Digital",
    text: "Sites and product surfaces with the same nerve as the print. Fast, exact, and a little stubborn.",
    image: photo("photo-1541701494587-cb58502866ab"),
    bg: "#ff5a36",
    fg: "#1a0d09",
  },
  {
    id: "campaigns",
    name: "Campaigns",
    text: "Films, stills, and lines that can live on a wall without needing a caption to explain themselves.",
    image: photo("photo-1470225620780-dba8ba36b745"),
    bg: "#1a1a1a",
    fg: "#f4efe6",
  },
  {
    id: "motion",
    name: "Motion",
    text: "Title sequences, launches, and the small movements that make a static identity feel awake.",
    image: photo("photo-1492691527719-9d1e07e534b4"),
    bg: "#d7efe6",
    fg: "#10241c",
  },
] as const;

export const works = [
  {
    num: "01",
    title: "House on the Ridge",
    place: "Lofoten, Norway",
    year: "2024",
    note: "A long house set into weather, with one room kept entirely for the view.",
    image: photo("photo-1600585154340-be6161a56a0c"),
  },
  {
    num: "02",
    title: "Courtyard Library",
    place: "Kyoto",
    year: "2023",
    note: "Reading rooms around an empty court. Timber, paper, and a single stone.",
    image: photo("photo-1487958449943-2429e8be8625"),
  },
  {
    num: "03",
    title: "Concrete Bath",
    place: "Porto",
    year: "2025",
    note: "A private bath cut from board-formed concrete above the river.",
    image: photo("photo-1511818966892-d7d671e672a2"),
  },
] as const;

export const pieces = [
  {
    num: "01",
    name: "Silla",
    designer: "Ines Maro",
    year: "2024",
    material: "Oak, linen",
    image: photo("photo-1567538096630-e0c55bd6374c"),
  },
  {
    num: "02",
    name: "Arc",
    designer: "Studio Feld",
    year: "2023",
    material: "Brushed brass",
    image: photo("photo-1507473885765-e6ed057f782c"),
  },
  {
    num: "03",
    name: "Low",
    designer: "N. Voss",
    year: "2025",
    material: "Travertine",
    image: photo("photo-1533090481720-856c6e3c1fdc"),
  },
  {
    num: "04",
    name: "Day",
    designer: "Marell",
    year: "2022",
    material: "Walnut, wool",
    image: photo("photo-1555041469-a586c61ea9bc"),
  },
] as const;

export const looks = [
  {
    id: "01",
    kicker: "Look 01",
    title: "Held light",
    text: "Glass, gold, and a wall the color of pollen.",
    image: photo("photo-1469334031218-e382a71b716b"),
  },
  {
    id: "02",
    kicker: "Look 02",
    title: "After rain",
    text: "Black coat, open throat, wet pavement.",
    image: photo("photo-1515886657613-9f3515b0c78f"),
  },
  {
    id: "03",
    kicker: "Look 03",
    title: "Unbuttoned",
    text: "Silk the color of a closed theater.",
    image: photo("photo-1496747611176-843222e1e57c"),
  },
] as const;

export const courses = [
  {
    id: "starters",
    name: "Starters",
    image: photo("photo-1414235077428-338989a2e8c0"),
    dishes: [
      ["Scallop crudo", "Citrus, fennel pollen, cold oil", "18"],
      ["Beef tartare", "Smoked yolk, rye, caper", "21"],
      ["Chicory", "Anchovy, walnut, burnt honey", "16"],
    ],
  },
  {
    id: "main",
    name: "Main",
    image: photo("photo-1414235077428-338989a2e8c0"),
    dishes: [
      ["Line-caught hake", "Saffron broth, mussels", "34"],
      ["Dry-aged duck", "Cherry, turnip, jus", "38"],
      ["Hand-cut pici", "Lamb ragù, pecorino", "26"],
    ],
  },
  {
    id: "dessert",
    name: "Dessert",
    image: photo("photo-1488477181946-6428a0291777"),
    dishes: [
      ["Olive oil cake", "Rosemary, crème fraîche", "14"],
      ["Dark chocolate", "Sea salt, olive", "15"],
      ["Blood orange", "Campari granita", "13"],
    ],
  },
  {
    id: "wine",
    name: "Wine",
    image: photo("photo-1510812431401-41d2bd2722f3"),
    dishes: [
      ["Etna Bianco, 2022", "Glass", "12"],
      ["Jura Poulsard, 2020", "Glass", "14"],
      ["Barolo, 2016", "Bottle", "92"],
    ],
  },
] as const;

export const destinations = [
  {
    id: "kyoto",
    city: "Kyoto",
    coords: "35.01° N  135.77° E",
    text: "Cedar rooms, night markets, and a week with no itinerary.",
    wash: "#6a3a2a",
    image: photo("photo-1493976040374-85c8e12f0c0e"),
  },
  {
    id: "amalfi",
    city: "Amalfi",
    coords: "40.63° N  14.60° E",
    text: "Houses stacked over a sea that refuses to stay one blue.",
    wash: "#0e3a44",
    image: photo("photo-1516483638261-f4dbaf036963"),
  },
  {
    id: "reykjavik",
    city: "Reykjavík",
    coords: "64.15° N  21.94° W",
    text: "Weather, geothermal pools, and a horizon with nowhere to hide.",
    wash: "#1c3a4a",
    image: photo("photo-1476610182048-b716b8518aae"),
  },
  {
    id: "marrakech",
    city: "Marrakech",
    coords: "31.63° N  8.01° W",
    text: "Courtyards, dust light, and tea poured from a height.",
    wash: "#7a3418",
    image: photo("photo-1489749798305-4fea3ae63d43"),
  },
] as const;

export const quotes = [
  {
    id: "giulia",
    quote: "The table was set as if the coast had come indoors.",
    name: "Giulia Ferrante",
    meta: "Amalfi",
    image: photo("photo-1534528741775-53994a69daeb", 1200),
  },
  {
    id: "jonah",
    quote: "I remember the brass more clearly than the speech.",
    name: "Jonah Ellis",
    meta: "Patron, Circle",
    image: photo("photo-1506794778202-cad84cf45f1d", 1200),
  },
  {
    id: "hanae",
    quote: "Nothing in the room asked to be noticed, so I noticed everything.",
    name: "Hanae Sato",
    meta: "Kyoto",
    image: photo("photo-1531746020798-e6953c6e8e04", 1200),
  },
  {
    id: "marc",
    quote: "It drives like a well-edited sentence.",
    name: "Marc Voss",
    meta: "Type 7",
    image: photo("photo-1524504388940-b1c1722653e1", 1200),
  },
] as const;

export const plans = [
  {
    id: "observer",
    name: "Observer",
    price: "€0",
    cadence: "Seasonal notes",
    benefits: "Two letters a year, archive access, no events.",
  },
  {
    id: "member",
    name: "Member",
    price: "€480",
    cadence: "Each year",
    benefits: "Salons, the reading room, and two guests at the spring viewing.",
  },
  {
    id: "patron",
    name: "Patron",
    price: "€2,400",
    cadence: "Each year",
    benefits: "Private hours, a commissioning circle, and first look at new rooms.",
  },
] as const;

export const questions = [
  {
    id: "begin",
    q: "How does a commission begin?",
    a: "With a letter, not a moodboard. Tell us how you live, what must stay, and the season you want the room to feel like. We reply with a visit or a refusal.",
    image: photo("photo-1618221195710-dd6b41faaea6"),
  },
  {
    id: "rooms",
    q: "Which rooms do you take on?",
    a: "Houses, one-room apartments, galleries, and the occasional dining room. We do not fit out offices, and we do not stage homes for sale.",
    image: photo("photo-1616486338812-3dadae4b4ace"),
  },
  {
    id: "materials",
    q: "What materials do you return to?",
    a: "Limewash, oak with the grain left open, unlacquered brass, linen, and stone that is allowed to stain. We would rather repair a surface than seal it.",
    image: photo("photo-1600210492486-724fe5c67fb0"),
  },
  {
    id: "visit",
    q: "Can we visit the studio?",
    a: "Thursdays, by appointment. The studio is a working room in the 11th. There is no showroom lighting and no one to walk you through a deck.",
    image: photo("photo-1615874959474-d609969a20ed"),
  },
] as const;

export const events = [
  ["09:14", "Ledger reconciled"],
  ["09:14", "Edge cache warmed"],
  ["09:13", "Invoice 1842 settled"],
  ["09:12", "Region eu-central quiet"],
  ["09:11", "Key rotated"],
  ["09:10", "Preview sealed"],
] as const;

export const footerNav = [
  ["Orris", "#orris"],
  ["Halden", "#halden"],
  ["Kline", "#kline"],
  ["Northline", "#northline"],
  ["Marell", "#marell"],
  ["Oru", "#oru"],
  ["Lume", "#lume"],
  ["Vant", "#vant"],
  ["Meridian", "#meridian"],
  ["Circle", "#circle"],
  ["Holm", "#holm"],
  ["Contact", "#contact"],
] as const;
