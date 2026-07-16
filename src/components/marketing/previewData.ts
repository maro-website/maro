import type { Project } from "@/lib/types";
import { makeProject } from "@/lib/mock/demo";

// Distinct example websites shown on the marketing page (rendered live).
export function landingExamples(): Project[] {
  return [
    makeProject({
      name: "Castello Branco",
      businessName: "Castello Branco",
      tagline: "Kuzhinë mesdhetare në zemër të qytetit.",
      goal: "Restaurant premium",
      category: "restaurant",
      style: "premium",
      location: "Prishtinë",
    }),
    makeProject({
      name: "Bright Dental",
      businessName: "Bright Dental",
      tagline: "Buzëqeshje të shëndetshme, kujdes modern.",
      goal: "Dental clinic",
      category: "dentist",
      style: "modern",
    }),
    makeProject({
      name: "NICE Studio",
      businessName: "NICE Studio",
      tagline: "We build brands people remember.",
      goal: "Creative agency",
      category: "agency",
      style: "editorial",
    }),
    makeProject({
      name: "Beton Group",
      businessName: "Beton Group",
      tagline: "Ndërtojmë hapësira që zgjasin.",
      goal: "Construction",
      category: "construction",
      style: "bold",
    }),
  ];
}

export function heroProject(): Project {
  return makeProject({
    name: "NICE Studio",
    businessName: "NICE Studio",
    tagline: "We build brands people remember.",
    goal: "Creative agency",
    category: "agency",
    style: "editorial",
  });
}
