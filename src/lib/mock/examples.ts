import type { WebsiteCategory } from "@/lib/types";

export interface ExamplePrompt {
  key: string;
  label: string;
  category: WebsiteCategory;
  text: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    key: "restaurant",
    label: "Restaurant",
    category: "restaurant",
    text: "Kam një restorant italian në Prishtinë me kuzhinë mesdhetare dhe verë. Dua një website elegant ku klientët shohin menunë, galerinë dhe rezervojnë tavolinë.",
  },
  {
    key: "agency",
    label: "Creative Agency",
    category: "agency",
    text: "We are a small creative studio doing branding and web design. We want a bold editorial website that shows our work and lets clients start a project.",
  },
  {
    key: "dentist",
    label: "Dentist",
    category: "dentist",
    text: "Kam një klinikë dentare moderne. Dua një website të pastër dhe të besueshëm ku pacientët shohin shërbimet dhe caktojnë termin online.",
  },
  {
    key: "portfolio",
    label: "Personal Portfolio",
    category: "portfolio",
    text: "I'm a designer and art director. I want a minimal, editorial portfolio to showcase selected projects and let people contact me.",
  },
  {
    key: "construction",
    label: "Construction Company",
    category: "construction",
    text: "Kam një kompani ndërtimi dhe mirëmbajtjeje në Hannover. Dua një website modern ku klientët shohin shërbimet dhe kërkojnë ofertë përmes WhatsApp.",
  },
];

// Landing page example website cards.
export const LANDING_EXAMPLES: {
  name: string;
  category: WebsiteCategory;
  tag: string;
  url: string;
}[] = [
  { name: "Castello Branco", category: "restaurant", tag: "Restaurant", url: "castello.maro.al" },
  { name: "Bright Dental", category: "dentist", tag: "Dentist", url: "bright.maro.al" },
  { name: "NICE Studio", category: "agency", tag: "Creative Agency", url: "nice.maro.al" },
  { name: "Beton Group", category: "construction", tag: "Construction", url: "beton.maro.al" },
];
