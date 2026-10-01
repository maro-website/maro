export const LEGAL_ENTITY = {
  name: "NICE Creative Agency SH.P.K.",
  nui: "810070821",
  nrb: "810070821",
  address: 'Rr. "Magjistralja Komoran - Caralevë"',
  municipality: "Gllogoc",
  country: "Kosovë",
  phone: "+38349xxxxxx",
  product: "maro.al",
  contactEmail: "legal@maro.al",
  supportEmail: "erzen@nice.al",
} as const;

export const LEGAL_ADDRESS = `${LEGAL_ENTITY.address}, ${LEGAL_ENTITY.municipality}, ${LEGAL_ENTITY.country}`;

export const LEGAL_PAGES = [
  { href: "/pricing", label: "Planet & Kreditet" },
  { href: "/contact", label: "Kontakt" },
  { href: "/legal/fair-use", label: "Përdorimi i drejtë" },
  { href: "/legal/terms", label: "Kushtet e Përdorimit" },
  { href: "/legal/privacy", label: "Politika e Privatësisë" },
  { href: "/legal/refund", label: "Politika e Rimbursimit" },
  { href: "/legal/cookies", label: "Politika e Cookies" },
] as const;

export const LEGAL_UPDATED = "7 Gusht 2026";
