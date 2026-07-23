// maroFort — canonical field schema (code-defined) for each expert module.
// The admin can override labels/defaults/visibility/options via
// app_settings.fort_config; getFortModuleSchema() merges the two so the UI and
// the server brief builder always agree on the effective schema.

import type {
  FortConfig,
  FortFieldSchema,
  FortFieldOverride,
  FortModuleId,
  FortModuleSchema,
  FortOption,
  FortSectionSchema,
} from "./types";

const opt = (id: string, label: string): FortOption => ({ id, label });

// ---------------------------------------------------------------------------
// Universal settings — appended to every module (shared expert controls).
// ---------------------------------------------------------------------------
const UNIVERSAL_SECTION: FortSectionSchema = {
  id: "universal",
  label: "Cilësime universale",
  description: "Kontrolle të përgjithshme që vlejnë për çdo gjenerim.",
  order: 90,
  fields: [
    {
      id: "creativeFreedom",
      type: "select",
      label: "Liria kreative",
      description: "Sa afër udhëzimeve duhet të qëndrojë modeli.",
      options: [
        opt("strict", "Strikte (ndiq udhëzimet përpikë)"),
        opt("balanced", "E balancuar"),
        opt("creative", "Kreative (jep liri modelit)"),
      ],
      default: "balanced",
      briefSection: "creative",
      priority: 30,
      order: 1,
    },
    {
      id: "referenceStrength",
      type: "slider",
      label: "Forca e referencës",
      description: "Sa fort të ndiqet imazhi/referenca e ngarkuar.",
      sliderMin: "E lirshme",
      sliderMax: "Besnike",
      default: "60",
      briefSection: "reference",
      priority: 40,
      order: 2,
    },
    {
      id: "mustInclude",
      type: "textarea",
      label: "Duhet të përmbajë",
      description: "Elemente të detyrueshme që duhen përfshirë.",
      placeholder: "p.sh. logoja lart majtas, ngjyra blu, teksti 'Zbritje 50%'",
      briefSection: "required",
      priority: 80,
      order: 3,
    },
    {
      id: "avoid",
      type: "textarea",
      label: "Shmang",
      description: "Gjëra që nuk duhen përdorur.",
      placeholder: "p.sh. pa tekst shtesë, pa njerëz, pa ngjyra të forta",
      briefSection: "restrictions",
      priority: 85,
      order: 4,
    },
    {
      id: "outputGoal",
      type: "select",
      label: "Qëllimi i rezultatit",
      options: [
        opt("premium", "Cilësi premium"),
        opt("conversion", "Konvertim maksimal"),
        opt("brand", "Konsistencë brendi"),
        opt("experimental", "Eksperimental"),
      ],
      default: "premium",
      briefSection: "output",
      priority: 20,
      order: 5,
    },
  ],
};

// ---------------------------------------------------------------------------
// Maro Web
// ---------------------------------------------------------------------------
const WEB_SCHEMA: FortModuleSchema = {
  id: "web",
  sections: [
    {
      id: "objective",
      label: "Objektivi",
      order: 1,
      fields: [
        {
          id: "objective",
          type: "select",
          label: "Qëllimi kryesor",
          options: [
            opt("leads", "Gjenerim leads"),
            opt("sales", "Shitje / e-commerce"),
            opt("portfolio", "Portfolio / prezantim"),
            opt("booking", "Rezervime / takime"),
            opt("info", "Informim / kompani"),
          ],
          default: "leads",
          briefSection: "objective",
          priority: 70,
          order: 1,
        },
        {
          id: "targetAudience",
          type: "text",
          label: "Audienca",
          placeholder: "p.sh. bizneset e vogla në Kosovë",
          briefSection: "objective",
          priority: 50,
          order: 2,
        },
        {
          id: "callToAction",
          type: "text",
          label: "Thirrje për veprim (CTA)",
          placeholder: "p.sh. Rezervo tani, Merr ofertën",
          briefSection: "required",
          priority: 60,
          order: 3,
        },
      ],
    },
    {
      id: "brand",
      label: "Brendi & biznesi",
      order: 2,
      fields: [
        {
          id: "businessName",
          type: "text",
          label: "Emri i biznesit",
          briefSection: "brand",
          priority: 60,
          order: 1,
        },
        {
          id: "industry",
          type: "select",
          label: "Industria",
          options: [
            opt("restaurant", "Restorant / kafe"),
            opt("dental", "Dentist / klinikë"),
            opt("agency", "Agjenci"),
            opt("construction", "Ndërtim"),
            opt("retail", "Shitje / dyqan"),
            opt("tech", "Teknologji / SaaS"),
            opt("other", "Tjetër"),
          ],
          briefSection: "brand",
          priority: 40,
          order: 2,
        },
        {
          id: "brandTone",
          type: "multiselect",
          label: "Toni i brendit",
          options: [
            opt("professional", "Profesional"),
            opt("playful", "Lozonjar"),
            opt("luxurious", "Luksoz"),
            opt("minimal", "Minimal"),
            opt("bold", "Guximtar"),
            opt("friendly", "Miqësor"),
          ],
          maxSelect: 3,
          briefSection: "creative",
          priority: 40,
          order: 3,
        },
        {
          id: "primaryColor",
          type: "color",
          label: "Ngjyra kryesore",
          default: "#3b17ff",
          mapsTo: "primaryColor",
          briefSection: "creative",
          priority: 35,
          order: 4,
        },
        {
          id: "secondaryColor",
          type: "color",
          label: "Ngjyra dytësore",
          briefSection: "creative",
          priority: 30,
          order: 5,
        },
      ],
    },
    {
      id: "structure",
      label: "Struktura & përmbajtja",
      order: 3,
      fields: [
        {
          id: "pages",
          type: "multiselect",
          label: "Faqet",
          options: [
            opt("home", "Ballina"),
            opt("about", "Rreth nesh"),
            opt("services", "Shërbime"),
            opt("pricing", "Çmimet"),
            opt("gallery", "Galeria"),
            opt("blog", "Blog"),
            opt("faq", "FAQ"),
            opt("contact", "Kontakt"),
          ],
          mapsTo: "pages",
          briefSection: "technical",
          priority: 45,
          order: 1,
        },
        {
          id: "sections",
          type: "multiselect",
          label: "Seksionet",
          options: [
            opt("hero", "Hero"),
            opt("features", "Veçoritë"),
            opt("testimonials", "Dëshmi"),
            opt("pricing", "Çmimet"),
            opt("stats", "Statistika"),
            opt("team", "Ekipi"),
            opt("faq", "FAQ"),
            opt("cta", "CTA"),
          ],
          briefSection: "technical",
          priority: 40,
          order: 2,
        },
        {
          id: "language",
          type: "select",
          label: "Gjuha",
          options: [opt("sq", "Shqip"), opt("en", "Anglisht"), opt("de", "Gjermanisht")],
          default: "sq",
          mapsTo: "language",
          briefSection: "technical",
          priority: 30,
          order: 3,
        },
      ],
    },
    {
      id: "style",
      label: "Stili & dizajni",
      order: 4,
      fields: [
        {
          id: "designStyle",
          type: "select",
          label: "Stili i dizajnit",
          options: [
            opt("minimal", "Minimal"),
            opt("premium", "Premium"),
            opt("editorial", "Editorial"),
            opt("bold", "Guximtar"),
            opt("modern", "Modern"),
            opt("playful", "Lozonjar"),
          ],
          default: "modern",
          briefSection: "creative",
          priority: 45,
          order: 1,
        },
        {
          id: "typography",
          type: "select",
          label: "Tipografia",
          options: [
            opt("sans", "Sans-serif"),
            opt("serif", "Serif"),
            opt("mixed", "E përzier"),
            opt("display", "Display"),
          ],
          briefSection: "creative",
          priority: 25,
          order: 2,
        },
        {
          id: "animationLevel",
          type: "select",
          label: "Niveli i animacioneve",
          options: [
            opt("none", "Pa animacione"),
            opt("subtle", "Të lehta"),
            opt("rich", "Të pasura"),
          ],
          default: "subtle",
          briefSection: "technical",
          priority: 20,
          order: 3,
        },
      ],
    },
    {
      id: "reference",
      label: "Referenca",
      order: 5,
      fields: [
        {
          id: "referenceUrls",
          type: "textarea",
          label: "Faqe referencë",
          placeholder: "Lidhje faqesh që të pëlqejnë (një për rresht)",
          briefSection: "reference",
          priority: 20,
          order: 1,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Maro Imazh (ads / creative images)
// ---------------------------------------------------------------------------
const IMAZH_SCHEMA: FortModuleSchema = {
  id: "imazh",
  sections: [
    {
      id: "objective",
      label: "Objektivi",
      order: 1,
      fields: [
        {
          id: "purpose",
          type: "select",
          label: "Qëllimi",
          options: [
            opt("product", "Reklamë produkti"),
            opt("promo", "Promocion / zbritje"),
            opt("awareness", "Ndërgjegjësim brendi"),
            opt("event", "Event"),
            opt("social", "Postim social"),
          ],
          default: "product",
          briefSection: "objective",
          priority: 70,
          order: 1,
        },
        {
          id: "platform",
          type: "select",
          label: "Platforma",
          options: [
            opt("instagram", "Instagram"),
            opt("facebook", "Facebook"),
            opt("tiktok", "TikTok"),
            opt("youtube", "YouTube"),
            opt("print", "Print"),
          ],
          briefSection: "technical",
          priority: 40,
          order: 2,
        },
      ],
    },
    {
      id: "subject",
      label: "Subjekti & mesazhi",
      order: 2,
      fields: [
        {
          id: "subject",
          type: "text",
          label: "Subjekti kryesor",
          placeholder: "p.sh. një shishe parfumi mbi mermer",
          briefSection: "primary",
          priority: 75,
          order: 1,
        },
        {
          id: "brandName",
          type: "text",
          label: "Emri i brendit",
          briefSection: "brand",
          priority: 45,
          order: 2,
        },
        {
          id: "headline",
          type: "text",
          label: "Titulli",
          placeholder: "Teksti kryesor mbi imazh",
          briefSection: "required",
          priority: 60,
          order: 3,
        },
        {
          id: "subheadline",
          type: "text",
          label: "Nëntitulli",
          briefSection: "required",
          priority: 40,
          order: 4,
        },
        {
          id: "includeText",
          type: "select",
          label: "Përfshi tekst në imazh",
          options: [opt("yes", "Po"), opt("no", "Jo")],
          default: "yes",
          briefSection: "required",
          priority: 35,
          order: 5,
        },
      ],
    },
    {
      id: "creative",
      label: "Drejtimi vizual",
      order: 3,
      fields: [
        {
          id: "visualStyle",
          type: "multiselect",
          label: "Stili vizual",
          options: [
            opt("photographic", "Fotografik"),
            opt("3d", "3D render"),
            opt("cinematic", "Kinematografik"),
            opt("editorial", "Editorial"),
            opt("minimal", "Minimal"),
            opt("vibrant", "Plot ngjyra"),
            opt("flat", "Flat / ilustrim"),
          ],
          maxSelect: 3,
          briefSection: "creative",
          priority: 55,
          order: 1,
        },
        {
          id: "mood",
          type: "select",
          label: "Atmosfera",
          options: [
            opt("energetic", "Energjike"),
            opt("calm", "E qetë"),
            opt("luxurious", "Luksoze"),
            opt("playful", "Lozonjare"),
            opt("serious", "Serioze"),
          ],
          briefSection: "creative",
          priority: 40,
          order: 2,
        },
        {
          id: "lighting",
          type: "select",
          label: "Ndriçimi",
          options: [
            opt("natural", "Natyral"),
            opt("studio", "Studio"),
            opt("dramatic", "Dramatik"),
            opt("soft", "I butë"),
            opt("neon", "Neon"),
          ],
          briefSection: "creative",
          priority: 30,
          order: 3,
        },
        {
          id: "colorScheme",
          type: "text",
          label: "Paleta e ngjyrave",
          placeholder: "p.sh. tone të ngrohta, ari & krem",
          briefSection: "creative",
          priority: 30,
          order: 4,
        },
        {
          id: "composition",
          type: "positionGrid",
          label: "Pozicioni i subjektit",
          briefSection: "creative",
          priority: 25,
          order: 5,
        },
      ],
    },
    {
      id: "reference",
      label: "Referenca / produkti",
      order: 4,
      fields: [
        {
          id: "productImage",
          type: "assetControl",
          label: "Imazhi i produktit",
          description: "Sa besnik të qëndrojë ndaj imazhit të ngarkuar.",
          briefSection: "reference",
          priority: 50,
          order: 1,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Maro Logo
// ---------------------------------------------------------------------------
const LOGO_SCHEMA: FortModuleSchema = {
  id: "logo",
  sections: [
    {
      id: "brand",
      label: "Brendi",
      order: 1,
      fields: [
        {
          id: "brandName",
          type: "text",
          label: "Emri i brendit",
          required: true,
          briefSection: "brand",
          priority: 75,
          order: 1,
        },
        {
          id: "tagline",
          type: "text",
          label: "Slogani",
          briefSection: "brand",
          priority: 35,
          order: 2,
        },
        {
          id: "industry",
          type: "select",
          label: "Industria",
          options: [
            opt("restaurant", "Restorant / kafe"),
            opt("tech", "Teknologji"),
            opt("fashion", "Modë"),
            opt("beauty", "Bukuri"),
            opt("construction", "Ndërtim"),
            opt("finance", "Financa"),
            opt("other", "Tjetër"),
          ],
          briefSection: "brand",
          priority: 40,
          order: 3,
        },
      ],
    },
    {
      id: "style",
      label: "Stili",
      order: 2,
      fields: [
        {
          id: "logoStyle",
          type: "select",
          label: "Lloji i logos",
          options: [
            opt("wordmark", "Wordmark (tekst)"),
            opt("lettermark", "Lettermark (inicialet)"),
            opt("symbol", "Simbol"),
            opt("combination", "Kombinim"),
            opt("emblem", "Emblemë"),
          ],
          default: "combination",
          briefSection: "creative",
          priority: 55,
          order: 1,
        },
        {
          id: "aesthetic",
          type: "multiselect",
          label: "Estetika",
          options: [
            opt("modern", "Modern"),
            opt("classic", "Klasik"),
            opt("minimal", "Minimal"),
            opt("playful", "Lozonjar"),
            opt("luxury", "Luks"),
            opt("tech", "Tech"),
            opt("organic", "Organik"),
          ],
          maxSelect: 3,
          briefSection: "creative",
          priority: 45,
          order: 2,
        },
        {
          id: "colorApproach",
          type: "select",
          label: "Qasja ndaj ngjyrës",
          options: [
            opt("monochrome", "Monokrom"),
            opt("two-tone", "Dy-ngjyrësh"),
            opt("gradient", "Gradient"),
            opt("vibrant", "Plot ngjyra"),
          ],
          briefSection: "creative",
          priority: 40,
          order: 3,
        },
        {
          id: "primaryColor",
          type: "color",
          label: "Ngjyra kryesore",
          default: "#3b17ff",
          briefSection: "creative",
          priority: 35,
          order: 4,
        },
      ],
    },
    {
      id: "symbolism",
      label: "Simbolika",
      order: 3,
      fields: [
        {
          id: "symbolIdeas",
          type: "textarea",
          label: "Ide për simbolin",
          placeholder: "p.sh. një gjeth i stilizuar, shkronja M abstrakte",
          briefSection: "creative",
          priority: 45,
          order: 1,
        },
        {
          id: "avoidCliches",
          type: "text",
          label: "Shmang klishetë",
          placeholder: "p.sh. pa botë, pa duar që shtrëngohen",
          briefSection: "restrictions",
          priority: 50,
          order: 2,
        },
      ],
    },
    {
      id: "technical",
      label: "Teknike",
      order: 4,
      fields: [
        {
          id: "usage",
          type: "multiselect",
          label: "Përdorimi",
          options: [
            opt("web", "Web"),
            opt("print", "Print"),
            opt("appicon", "App icon"),
            opt("signage", "Tabela"),
            opt("merch", "Merch"),
          ],
          briefSection: "technical",
          priority: 30,
          order: 1,
        },
        {
          id: "background",
          type: "select",
          label: "Sfondi",
          options: [
            opt("light", "I çelët"),
            opt("dark", "I errët"),
            opt("transparent", "Transparent"),
          ],
          briefSection: "technical",
          priority: 25,
          order: 2,
        },
      ],
    },
  ],
};

const BASE_SCHEMAS: Record<FortModuleId, FortModuleSchema> = {
  web: WEB_SCHEMA,
  imazh: IMAZH_SCHEMA,
  logo: LOGO_SCHEMA,
};

// Each module ends with the shared universal section.
function withUniversal(schema: FortModuleSchema): FortModuleSchema {
  return { ...schema, sections: [...schema.sections, UNIVERSAL_SECTION] };
}

function applyFieldOverride(
  field: FortFieldSchema,
  ov: FortFieldOverride | undefined
): FortFieldSchema | null {
  if (!ov) return field;
  if (ov.enabled === false) return null;
  let options = field.options;
  if (options && (ov.hiddenOptions?.length || ov.optionLabels || ov.addedOptions?.length)) {
    options = options
      .filter((o) => !ov.hiddenOptions?.includes(o.id))
      .map((o) => (ov.optionLabels?.[o.id] ? { ...o, label: ov.optionLabels[o.id] } : o));
    if (ov.addedOptions?.length) options = [...options, ...ov.addedOptions];
  }
  return {
    ...field,
    label: ov.label ?? field.label,
    description: ov.description ?? field.description,
    placeholder: ov.placeholder ?? field.placeholder,
    order: ov.order ?? field.order,
    required: ov.required ?? field.required,
    default: ov.default ?? field.default,
    options,
  };
}

// Merge the code schema for a module with admin overrides from fort_config.
// Applies field enable/disable, relabel, reorder, option edits, and sorts.
export function getFortModuleSchema(
  module: FortModuleId,
  config?: FortConfig
): FortModuleSchema {
  const base = withUniversal(BASE_SCHEMAS[module]);
  const override = config?.modules?.[module];
  const sections = base.sections
    .map((sec) => {
      const fields = sec.fields
        .map((f) => applyFieldOverride(f, override?.fields?.[f.id]))
        .filter((f): f is FortFieldSchema => f !== null)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return { ...sec, fields } as FortSectionSchema;
    })
    .filter((sec) => sec.fields.length > 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { id: base.id, sections };
}

// Flat list of effective fields for a module (used by the brief builder).
export function getFortFields(module: FortModuleId, config?: FortConfig): FortFieldSchema[] {
  return getFortModuleSchema(module, config).sections.flatMap((s) => s.fields);
}

// Initial values for a module — only fields that carry an explicit default.
export function defaultFortValues(
  module: FortModuleId,
  config?: FortConfig
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const f of getFortFields(module, config)) {
    if (f.default !== undefined) out[f.id] = f.default;
  }
  return out;
}

export { BASE_SCHEMAS, UNIVERSAL_SECTION };
