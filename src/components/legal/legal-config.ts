export const LEGAL_ENTITY = {
  name: "NICE Creative Agency SH.P.K.",
  nui: "810070821",
  nrb: "810070821",
  address: 'Rr. "Magjistralja Komoran - Caralevë"',
  municipality: "Gllogoc",
  country: "Kosovë",
  phone: "+38349593777",
  product: "maro.al",
  contactEmail: "info@maro.al",
  supportEmail: "info@maro.al",
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

export const LEGAL_UPDATED = "9 Tetor 2026";

export const LEGAL_SOURCES = {
  privacy: "https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=18616",
  consumer: "https://gzk.rks-gov.net/ActDocumentDetail.aspx?ActID=16551",
  electronicServices: "https://gzk.rks-gov.net/ActDetail.aspx?ActID=2811",
  privacyAuthority: "https://aip.rks-gov.net/",
  consumerAuthority: "https://konsumatori.rks-gov.net/",
} as const;
