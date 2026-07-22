import type {
  WebsiteCategory,
  WebsitePage,
  WebsiteSection,
  SeoMeta,
} from "@/lib/types";
import { genImage } from "./images";
import { uid, slugify } from "@/lib/utils/format";

function section(kind: WebsiteSection["kind"], data: Record<string, unknown>): WebsiteSection {
  return { id: uid("sec"), kind, data };
}

function seo(title: string, description: string, slug: string): SeoMeta {
  return { title, description, slug };
}

interface FactoryInput {
  businessName: string;
  tagline?: string;
  category: WebsiteCategory;
  email?: string;
  phone?: string;
  location?: string;
}

const img = (seed: string, category: string, w = 900, h = 700, variant?: number) =>
  genImage({ seed, category, w, h, variant });

// ---------------------------------------------------------------------------
// Home page compositions — deliberately different per category
// ---------------------------------------------------------------------------

function restaurantHome(i: FactoryInput): WebsiteSection[] {
  const c = "restaurant";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "split",
      eyebrow: "Ristorante · " + (i.location ?? "Prishtinë"),
      title: name,
      subtitle: i.tagline ?? "Kuzhinë mesdhetare, përbërës të freskët, mbrëmje që mbahen mend.",
      ctaPrimary: "Rezervo tavolinë",
      ctaSecondary: "Shiko menunë",
      image: img(name + "-hero", c, 1000, 900, 0),
    }),
    section("stats", {
      items: [
        { value: "2011", label: "Që nga" },
        { value: "4.9", label: "Vlerësim mesatar" },
        { value: "60+", label: "Pjata sezonale" },
      ],
    }),
    section("about", {
      title: "Shija që tregon një histori",
      body: "Çdo pjatë përgatitet me dorë nga kuzhinierët tanë, duke përdorur përbërës lokalë dhe receta të kaluara brez pas brezi. Përjetoni ngrohtësinë e një darke të vërtetë.",
      image: img(name + "-about", c, 800, 900, 1),
    }),
    section("menu", {
      title: "Menuja",
      subtitle: "Një përzgjedhje e favoriteve tona sezonale.",
      groups: [
        {
          name: "Antipasta",
          items: [
            { name: "Bruschetta al Pomodoro", price: "4.50€", desc: "Domate të freskëta, borzilok, vaj ulliri" },
            { name: "Tagliere Misto", price: "9.00€", desc: "Djathëra e sallam të zgjedhur" },
          ],
        },
        {
          name: "Primi",
          items: [
            { name: "Tagliatelle al Tartufo", price: "12.00€", desc: "Tartuf i zi, parmixhano" },
            { name: "Risotto ai Funghi", price: "11.50€", desc: "Kërpudha porcini, verë e bardhë" },
          ],
        },
      ],
    }),
    section("gallery", {
      title: "Nga tavolina jonë",
      images: [0, 1, 2, 3].map((n) => img(name + "-g" + n, c, 600, 600, n % 3)),
    }),
    section("testimonial", {
      quote: "Përvoja më e mirë kulinare në qytet. Atmosferë e ngrohtë dhe shërbim i përsosur.",
      author: "Elira K.",
      role: "Google Reviews",
    }),
    section("cta", {
      title: "Rezervo tavolinën tënde sonte",
      subtitle: "Tavolinat e fundjavës plotësohen shpejt.",
      button: "Rezervo tani",
    }),
    section("contact", {
      title: "Na vizito",
      email: i.email ?? "rezervime@" + slugify(name) + ".al",
      phone: i.phone ?? "+383 44 000 000",
      address: i.location ?? "Rr. Nëna Terezë 12, Prishtinë",
    }),
  ];
}

function dentistHome(i: FactoryInput): WebsiteSection[] {
  const c = "dentist";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "centered",
      eyebrow: "Klinikë Dentare",
      title: name,
      subtitle: i.tagline ?? "Buzëqeshje të shëndetshme me kujdes modern dhe pa dhimbje.",
      ctaPrimary: "Cakto termin",
      ctaSecondary: "Shërbimet tona",
      image: img(name + "-hero", c, 1200, 700, 0),
    }),
    section("logos", { items: ["Invisalign", "Straumann", "Philips", "3M", "Ivoclar"] }),
    section("services", {
      title: "Shërbimet tona",
      subtitle: "Kujdes gjithëpërfshirës për të gjithë familjen.",
      items: [
        { title: "Kontroll & Higjienë", desc: "Kontrolle të rregullta dhe pastrim profesional.", icon: "shield-check" },
        { title: "Implante Dentare", desc: "Zëvendësim i qëndrueshëm dhe natyral i dhëmbëve.", icon: "sparkles" },
        { title: "Ortodonci", desc: "Invisalign dhe aparate për një buzëqeshje të drejtë.", icon: "smile" },
        { title: "Zbardhim", desc: "Buzëqeshje më e ndritshme në një vizitë.", icon: "sun" },
      ],
    }),
    section("stats", {
      items: [
        { value: "15k+", label: "Pacientë të lumtur" },
        { value: "20+", label: "Vite përvojë" },
        { value: "98%", label: "Kënaqësi" },
      ],
    }),
    section("process", {
      title: "Si funksionon",
      steps: [
        { step: "01", title: "Cakto terminin", desc: "Zgjidh një orar që të përshtatet." },
        { step: "02", title: "Konsultim", desc: "Plan trajtimi i personalizuar." },
        { step: "03", title: "Trajtim", desc: "Kujdes i qetë dhe pa dhimbje." },
      ],
    }),
    section("testimonial", {
      quote: "Ekipi më i kujdesshëm që kam takuar. Nuk kam pasur më frikë nga dentisti.",
      author: "Arben M.",
      role: "Pacient",
    }),
    section("cta", {
      title: "Buzëqeshja jote fillon këtu",
      subtitle: "Termini i parë me konsultim falas.",
      button: "Cakto termin",
    }),
    section("contact", {
      title: "Na kontakto",
      email: i.email ?? "info@" + slugify(name) + ".al",
      phone: i.phone ?? "+383 44 111 222",
      address: i.location ?? "Rr. Agim Ramadani 8, Prishtinë",
    }),
  ];
}

function agencyHome(i: FactoryInput): WebsiteSection[] {
  const c = "agency";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "editorial",
      eyebrow: "Creative Studio",
      title: i.tagline ?? "We build brands people remember.",
      subtitle: "A design & technology studio crafting identities, websites and products for ambitious teams.",
      ctaPrimary: "Start a project",
      ctaSecondary: "View work",
      image: img(name + "-hero", c, 1200, 800, 0),
    }),
    section("logos", { items: ["Northwind", "Lumen", "Fjord", "Atlas", "Verve", "Kite"] }),
    section("work", {
      title: "Selected work",
      items: [
        { title: "Lumen Rebrand", tag: "Branding", image: img(name + "-w1", c, 800, 640, 0) },
        { title: "Fjord Platform", tag: "Product", image: img(name + "-w2", c, 800, 640, 1) },
        { title: "Atlas Commerce", tag: "Web", image: img(name + "-w3", c, 800, 640, 2) },
        { title: "Verve Campaign", tag: "Motion", image: img(name + "-w4", c, 800, 640, 0) },
      ],
    }),
    section("services", {
      title: "What we do",
      subtitle: "Full-stack creative capability under one roof.",
      items: [
        { title: "Brand Identity", desc: "Naming, logo systems, guidelines.", icon: "palette" },
        { title: "Web & Product", desc: "Design and build for web and mobile.", icon: "layout" },
        { title: "Motion", desc: "Brand films and animation.", icon: "play" },
        { title: "Strategy", desc: "Positioning and go-to-market.", icon: "compass" },
      ],
    }),
    section("stats", {
      items: [
        { value: "120+", label: "Projects shipped" },
        { value: "9", label: "Design awards" },
        { value: "40", label: "Global clients" },
      ],
    }),
    section("testimonial", {
      quote: "They translated a vague idea into a brand that doubled our inbound. Rare studio.",
      author: "Sara Lind",
      role: "CEO, Fjord",
    }),
    section("cta", {
      title: "Have something in mind?",
      subtitle: "Let's make it real.",
      button: "Start a project",
    }),
    section("contact", {
      title: "Say hello",
      email: i.email ?? "hello@" + slugify(name) + ".com",
      phone: i.phone ?? "+383 44 333 444",
      address: i.location ?? "Prishtinë · Remote worldwide",
    }),
  ];
}

function constructionHome(i: FactoryInput): WebsiteSection[] {
  const c = "construction";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "split",
      eyebrow: "Ndërtim & Mirëmbajtje",
      title: name,
      subtitle: i.tagline ?? "Ndërtojmë hapësira që zgjasin. Cilësi, saktësi dhe afate të respektuara.",
      ctaPrimary: "Kërko ofertë",
      ctaSecondary: "Projektet tona",
      image: img(name + "-hero", c, 1100, 800, 0),
    }),
    section("stats", {
      items: [
        { value: "250+", label: "Projekte të përfunduara" },
        { value: "18", label: "Vite në treg" },
        { value: "100%", label: "Afate të respektuara" },
      ],
    }),
    section("services", {
      title: "Shërbimet",
      subtitle: "Nga themeli deri te çelësi në dorë.",
      items: [
        { title: "Ndërtim i ri", desc: "Objekte banimi dhe komerciale.", icon: "building-2" },
        { title: "Renovim", desc: "Rinovim i plotë i brendshëm dhe i jashtëm.", icon: "hammer" },
        { title: "Mirëmbajtje", desc: "Kontrata mirëmbajtjeje afatgjata.", icon: "wrench" },
        { title: "Peizazh", desc: "Kopshte dhe hapësira të gjelbra.", icon: "trees" },
      ],
    }),
    section("work", {
      title: "Projekte të përzgjedhura",
      items: [
        { title: "Villa Dardania", tag: "Rezidencial", image: img(name + "-p1", c, 800, 620, 0) },
        { title: "Business Park", tag: "Komercial", image: img(name + "-p2", c, 800, 620, 1) },
        { title: "Rinovim Zyre", tag: "Interier", image: img(name + "-p3", c, 800, 620, 2) },
      ],
    }),
    section("process", {
      title: "Procesi ynë",
      steps: [
        { step: "01", title: "Konsultim", desc: "Kuptojmë nevojat dhe buxhetin." },
        { step: "02", title: "Plan & Ofertë", desc: "Ofertë transparente pa surpriza." },
        { step: "03", title: "Realizim", desc: "Ekip i dedikuar deri në dorëzim." },
      ],
    }),
    section("cta", {
      title: "Gati për të filluar projektin?",
      subtitle: "Merr një ofertë falas brenda 24 orësh.",
      button: "Kërko ofertë",
    }),
    section("contact", {
      title: "Na kontakto",
      email: i.email ?? "info@" + slugify(name) + ".al",
      phone: i.phone ?? "+383 44 555 666",
      address: i.location ?? "Zona Industriale, Prishtinë",
    }),
  ];
}

function portfolioHome(i: FactoryInput): WebsiteSection[] {
  const c = "portfolio";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "minimal",
      eyebrow: "Portfolio",
      title: name,
      subtitle: i.tagline ?? "Designer & art director focused on brand, type and interface.",
      ctaPrimary: "Get in touch",
      ctaSecondary: "See work",
      image: img(name + "-hero", c, 1000, 800, 0),
    }),
    section("work", {
      title: "Selected work",
      items: [
        { title: "Editorial System", tag: "2025", image: img(name + "-w1", c, 800, 900, 0) },
        { title: "Type Specimen", tag: "2024", image: img(name + "-w2", c, 800, 900, 1) },
        { title: "Museum Identity", tag: "2024", image: img(name + "-w3", c, 800, 900, 2) },
      ],
    }),
    section("about", {
      title: "About",
      body: "I help founders and cultural institutions craft distinctive visual identities. Ten years across branding, editorial and digital product.",
      image: img(name + "-about", c, 700, 800, 1),
    }),
    section("stats", {
      items: [
        { value: "10y", label: "Experience" },
        { value: "60+", label: "Projects" },
        { value: "4", label: "Awards" },
      ],
    }),
    section("cta", {
      title: "Let's work together",
      subtitle: "Currently taking projects for Q3.",
      button: "Get in touch",
    }),
    section("contact", {
      title: "Contact",
      email: i.email ?? "hi@" + slugify(name) + ".com",
      phone: i.phone ?? "",
      address: i.location ?? "Available worldwide",
    }),
  ];
}

function genericHome(i: FactoryInput): WebsiteSection[] {
  const c = "generic";
  const name = i.businessName;
  return [
    section("hero", {
      layout: "centered",
      eyebrow: i.tagline ? "" : "Biznes",
      title: name,
      subtitle: i.tagline ?? "Zgjidhja moderne për biznesin tënd. Thjeshtë, e shpejtë, profesionale.",
      ctaPrimary: "Fillo tani",
      ctaSecondary: "Mëso më shumë",
      image: img(name + "-hero", c, 1200, 700, 0),
    }),
    section("features", {
      title: "Pse ne",
      subtitle: "Gjithçka që të nevojitet në një vend.",
      items: [
        { title: "E shpejtë", desc: "Rezultate që nga dita e parë.", icon: "zap" },
        { title: "E besueshme", desc: "Cilësi që mund të mbështetesh.", icon: "shield-check" },
        { title: "E thjeshtë", desc: "Pa komplikime, pa stres.", icon: "sparkles" },
      ],
    }),
    section("stats", {
      items: [
        { value: "1000+", label: "Klientë" },
        { value: "4.9", label: "Vlerësim" },
        { value: "24/7", label: "Mbështetje" },
      ],
    }),
    section("testimonial", {
      quote: "Shërbim i shkëlqyer dhe rezultate reale. E rekomandoj pa hezitim.",
      author: "Driton B.",
      role: "Klient",
    }),
    section("cta", {
      title: "Gati për të filluar?",
      subtitle: "Bashkohu me qindra klientë të kënaqur.",
      button: "Fillo tani",
    }),
    section("contact", {
      title: "Na kontakto",
      email: i.email ?? "info@" + slugify(name) + ".al",
      phone: i.phone ?? "+383 44 000 000",
      address: i.location ?? "Prishtinë, Kosovë",
    }),
  ];
}

const HOME_BUILDERS: Record<WebsiteCategory, (i: FactoryInput) => WebsiteSection[]> = {
  restaurant: restaurantHome,
  dentist: dentistHome,
  agency: agencyHome,
  construction: constructionHome,
  portfolio: portfolioHome,
  generic: genericHome,
};

// Secondary pages (About / Services / Contact / Work) reuse relevant sections.
function secondaryPages(i: FactoryInput): WebsitePage[] {
  const home = HOME_BUILDERS[i.category](i);
  const find = (k: WebsiteSection["kind"]) => home.find((s) => s.kind === k);
  const pages: WebsitePage[] = [];

  const aboutSec = find("about") ?? section("about", {
    title: "Rreth nesh",
    body: `${i.businessName} është krijuar për t'i shërbyer klientëve me përkushtim dhe cilësi. Njihuni me historinë dhe vlerat tona.`,
    image: img(i.businessName + "-about2", i.category, 700, 800, 2),
  });
  pages.push({
    id: uid("page"),
    name: i.category === "agency" || i.category === "portfolio" ? "About" : "Rreth",
    slug: "about",
    sections: [
      { ...aboutSec, id: uid("sec") },
      { ...(find("stats") ?? section("stats", { items: [] })), id: uid("sec") },
      { ...(find("team") ?? section("team", {
        title: "Ekipi ynë",
        members: [0, 1, 2].map((n) => ({
          name: ["Ana Berisha", "Ben Krasniqi", "Lira Hoxha"][n],
          role: ["Founder", "Lead", "Operations"][n],
          avatar: img(i.businessName + "-m" + n, i.category, 400, 400, n),
        })),
      })), id: uid("sec") },
    ],
    seo: seo(`Rreth · ${i.businessName}`, "Njihuni me historinë tonë.", "about"),
  });

  const servicesSec = find("services") ?? find("menu") ?? find("work");
  if (servicesSec) {
    pages.push({
      id: uid("page"),
      name: i.category === "restaurant" ? "Menu" : i.category === "agency" || i.category === "portfolio" ? "Work" : "Shërbime",
      slug: i.category === "restaurant" ? "menu" : i.category === "agency" || i.category === "portfolio" ? "work" : "services",
      sections: [
        { ...servicesSec, id: uid("sec") },
        { ...(find("process") ?? section("cta", { title: "Gati?", subtitle: "Na kontakto sot.", button: "Kontakto" })), id: uid("sec") },
      ],
      seo: seo(`Shërbime · ${i.businessName}`, "Çka ofrojmë.", "services"),
    });
  }

  pages.push({
    id: uid("page"),
    name: i.category === "agency" || i.category === "portfolio" ? "Contact" : "Kontakt",
    slug: "contact",
    sections: [
      { ...(find("contact") ?? section("contact", { title: "Kontakt", email: i.email, phone: i.phone, address: i.location })), id: uid("sec") },
    ],
    seo: seo(`Kontakt · ${i.businessName}`, "Na kontaktoni.", "contact"),
  });

  return pages;
}

export function buildPages(i: FactoryInput): WebsitePage[] {
  const homeSections = HOME_BUILDERS[i.category](i);
  const home: WebsitePage = {
    id: uid("page"),
    name: i.category === "agency" || i.category === "portfolio" ? "Home" : "Ballina",
    slug: "home",
    sections: homeSections,
    seo: seo(
      `${i.businessName}${i.tagline ? " · " + i.tagline : ""}`,
      i.tagline ?? "Website i krijuar me maro.",
      "home"
    ),
  };
  return [home, ...secondaryPages(i)];
}
