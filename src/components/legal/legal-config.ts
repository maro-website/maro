export const LEGAL_ENTITY = {
  name: "NICE Creative Agency sh.p.k",
  nui: "810070821",
  address: 'Rr. "Magjistralja Komoran - Caralevë"',
  product: "maro.al",
  contactEmail: "legal@maro.al",
  supportEmail: "erzen@nice.al",
  country: "Shqipëri",
} as const;

export const LEGAL_ADDRESS = `${LEGAL_ENTITY.address}, ${LEGAL_ENTITY.country}`;

export const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Kushtet e Përdorimit" },
  { href: "/legal/privacy", label: "Politika e Privatësisë" },
  { href: "/legal/refund", label: "Politika e Rimbursimit" },
  { href: "/legal/cookies", label: "Politika e Cookies" },
  { href: "/credits", label: "Çmimet & Kreditet" },
] as const;

export const LEGAL_UPDATED = "4 Gusht 2026";
