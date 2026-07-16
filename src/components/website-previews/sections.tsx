"use client";

import * as React from "react";
import type { Theme, WebsiteSection, WebsiteCategory } from "@/lib/types";
import { buttonStyle } from "./theme";
import { Editable, type EditContext } from "./Editable";
import {
  ShieldCheck,
  Sparkles,
  Smile,
  Sun,
  Palette,
  Layout,
  Play,
  Compass,
  Building2,
  Hammer,
  Wrench,
  Trees,
  Zap,
  Check,
  ArrowRight,
  Star,
  Mail,
  Phone,
  MapPin,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  smile: Smile,
  sun: Sun,
  palette: Palette,
  layout: Layout,
  play: Play,
  compass: Compass,
  "building-2": Building2,
  hammer: Hammer,
  wrench: Wrench,
  trees: Trees,
  zap: Zap,
};

interface Ctx extends EditContext {
  theme: Theme;
  category: WebsiteCategory;
}

const container: React.CSSProperties = {
  maxWidth: 1120,
  marginInline: "auto",
  paddingInline: "clamp(20px, 5vw, 40px)",
};

// Responsive multi-column grid that reflows down to a single column on narrow
// device previews (tablet / mobile) without any JS.
function cols(min: number): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` };
}

function Btn({
  label,
  variant,
  theme,
}: {
  label: string;
  variant: "primary" | "secondary";
  theme: Theme;
}) {
  return <span style={buttonStyle(theme.buttonStyle, variant, theme)}>{label}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--p)",
        marginBottom: 18,
        fontFamily: "var(--bf)",
      }}
    >
      {children}
    </div>
  );
}

function d<T = string>(s: WebsiteSection, k: string, fb: T): T {
  return (s.data[k] as T) ?? fb;
}

// ---------------------------------------------------------------------------

function Hero({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const { theme } = ctx;
  const layout = d<string>(s, "layout", "centered");
  const title = d(s, "title", "");
  const subtitle = d(s, "subtitle", "");
  const eyebrow = d(s, "eyebrow", "");
  const image = d(s, "image", "");
  const ctaP = d(s, "ctaPrimary", "Get started");
  const ctaS = d(s, "ctaSecondary", "");

  const TitleEl = (
    <Editable
      as="h1"
      ctx={ctx}
      target={{ sectionId: s.id, kind: "text", field: "title", label: "Hero Title", value: title }}
      style={{
        fontFamily: "var(--hf)",
        fontWeight: theme.headingFont.includes("Serif") || theme.headingFont === "Playfair Display" ? 600 : 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.02,
        fontSize: layout === "editorial" ? "clamp(38px,5.4vw,72px)" : "clamp(34px,4.6vw,60px)",
        margin: 0,
        color: "var(--tx)",
      }}
    >
      {title}
    </Editable>
  );

  const SubEl = (
    <Editable
      as="p"
      ctx={ctx}
      target={{ sectionId: s.id, kind: "text", field: "subtitle", label: "Hero Subtitle", value: subtitle }}
      style={{
        fontSize: 18,
        lineHeight: 1.55,
        color: "var(--muted)",
        maxWidth: 560,
        marginTop: 22,
        fontFamily: "var(--bf)",
      }}
    >
      {subtitle}
    </Editable>
  );

  const Ctas = (
    <div style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap" }}>
      <Editable
        ctx={ctx}
        target={{ sectionId: s.id, kind: "button", field: "ctaPrimary", label: "Button", value: ctaP }}
      >
        <Btn label={ctaP} variant="primary" theme={theme} />
      </Editable>
      {ctaS && <Btn label={ctaS} variant="secondary" theme={theme} />}
    </div>
  );

  const ImgEl = image && (
    <Editable
      ctx={ctx}
      target={{ sectionId: s.id, kind: "image", field: "image", label: "Hero Image", value: image }}
      style={{ width: "100%" }}
    >
      <img
        src={image}
        alt=""
        style={{
          width: "100%",
          height: layout === "split" ? 520 : 420,
          objectFit: "cover",
          borderRadius: "calc(var(--rad) + 6px)",
          display: "block",
        }}
      />
    </Editable>
  );

  if (layout === "split") {
    return (
      <section style={{ paddingBlock: 72 }}>
        <div style={{ ...container, ...cols(320), gap: 56, alignItems: "center" }}>
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            {TitleEl}
            {SubEl}
            {Ctas}
          </div>
          <div>{ImgEl}</div>
        </div>
      </section>
    );
  }

  if (layout === "editorial") {
    return (
      <section style={{ paddingBlock: 80 }}>
        <div style={container}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <div style={{ maxWidth: 940 }}>{TitleEl}</div>
          <div style={{ ...cols(280), gap: 40, marginTop: 24, alignItems: "end" }}>
            {SubEl}
            <div style={{ justifySelf: "end" }}>{Ctas}</div>
          </div>
          <div style={{ marginTop: 44 }}>{ImgEl}</div>
        </div>
      </section>
    );
  }

  if (layout === "minimal") {
    return (
      <section style={{ paddingBlock: 88 }}>
        <div style={{ ...container, maxWidth: 820 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          {TitleEl}
          {SubEl}
          {Ctas}
        </div>
      </section>
    );
  }

  // centered
  return (
    <section style={{ paddingBlock: 80, textAlign: "center" }}>
      <div style={{ ...container, maxWidth: 820, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        {TitleEl}
        <div style={{ display: "flex", justifyContent: "center" }}>{SubEl}</div>
        <div style={{ display: "flex", justifyContent: "center" }}>{Ctas}</div>
        {image && <div style={{ marginTop: 48, width: "100%" }}>{ImgEl}</div>}
      </div>
    </section>
  );
}

function Logos({ s }: { s: WebsiteSection; ctx: Ctx }) {
  const items = d<string[]>(s, "items", []);
  return (
    <section style={{ paddingBlock: 36, borderBlock: "1px solid var(--line)" }}>
      <div style={{ ...container, display: "flex", gap: 44, flexWrap: "wrap", justifyContent: "center", alignItems: "center", opacity: 0.62 }}>
        {items.map((it, i) => (
          <span key={i} style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: "var(--tx)" }}>
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ s, ctx, subKey = "subtitle" }: { s: WebsiteSection; ctx: Ctx; subKey?: string }) {
  const title = d(s, "title", "");
  const subtitle = d(s, subKey, "");
  return (
    <div style={{ maxWidth: 640, marginBottom: 44 }}>
      <Editable
        as="h2"
        ctx={ctx}
        target={{ sectionId: s.id, kind: "text", field: "title", label: "Section Title", value: title }}
        style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: "clamp(26px,3.2vw,40px)", letterSpacing: "-0.025em", margin: 0, color: "var(--tx)" }}
      >
        {title}
      </Editable>
      {subtitle && (
        <p style={{ marginTop: 12, fontSize: 16.5, color: "var(--muted)", fontFamily: "var(--bf)", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Features({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const items = d<{ title: string; desc: string; icon: string }[]>(s, "items", []);
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(210), gap: 20 }}>
          {items.map((it, i) => {
            const Icon = ICONS[it.icon] ?? Sparkles;
            return (
              <div key={i} style={{ padding: 26, borderRadius: "var(--rad)", border: "1px solid var(--line)", background: "var(--card)" }}>
                <div style={{ width: 44, height: 44, borderRadius: "calc(var(--rad) * .7)", background: "color-mix(in srgb, var(--p) 12%, transparent)", color: "var(--p)", display: "grid", placeItems: "center", marginBottom: 18 }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 18, margin: 0, color: "var(--tx)" }}>{it.title}</h3>
                <p style={{ marginTop: 8, fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55, fontFamily: "var(--bf)" }}>{it.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stats({ s }: { s: WebsiteSection; ctx: Ctx }) {
  const items = d<{ value: string; label: string }[]>(s, "items", []);
  if (!items.length) return null;
  return (
    <section style={{ paddingBlock: 56 }}>
      <div style={{ ...container, ...cols(120), gap: 24, textAlign: "center" }}>
        {items.map((it, i) => (
          <div key={i}>
            <div style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: "clamp(32px,4vw,52px)", letterSpacing: "-0.03em", color: "var(--p)" }}>{it.value}</div>
            <div style={{ marginTop: 6, fontSize: 14, color: "var(--muted)", fontFamily: "var(--bf)", fontWeight: 500 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function About({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const title = d(s, "title", "");
  const body = d(s, "body", "");
  const image = d(s, "image", "");
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={{ ...container, ...(image ? cols(300) : { display: "block" }), gap: 56, alignItems: "center" }}>
        <div>
          <Editable as="h2" ctx={ctx} target={{ sectionId: s.id, kind: "text", field: "title", label: "Title", value: title }}
            style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: "clamp(26px,3.2vw,40px)", letterSpacing: "-0.025em", margin: 0, color: "var(--tx)" }}>
            {title}
          </Editable>
          <Editable as="p" ctx={ctx} target={{ sectionId: s.id, kind: "text", field: "body", label: "Body Text", value: body }}
            style={{ marginTop: 18, fontSize: 16.5, color: "var(--muted)", lineHeight: 1.65, fontFamily: "var(--bf)" }}>
            {body}
          </Editable>
        </div>
        {image && (
          <Editable ctx={ctx} target={{ sectionId: s.id, kind: "image", field: "image", label: "Image", value: image }}>
            <img src={image} alt="" style={{ width: "100%", height: 440, objectFit: "cover", borderRadius: "calc(var(--rad) + 6px)", display: "block" }} />
          </Editable>
        )}
      </div>
    </section>
  );
}

function Services({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  return <Features s={s} ctx={ctx} />;
}

function Work({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const items = d<{ title: string; tag: string; image: string }[]>(s, "items", []);
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(280), gap: 24 }}>
          {items.map((it, i) => (
            <div key={i} style={{ overflow: "hidden", borderRadius: "calc(var(--rad) + 4px)", border: "1px solid var(--line)" }}>
              <img src={it.image} alt="" style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "18px 20px", background: "var(--card)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 18, color: "var(--tx)" }}>{it.title}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--p)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{it.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Menu({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const groups = d<{ name: string; items: { name: string; price: string; desc: string }[] }[]>(s, "groups", []);
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(280), gap: 48 }}>
          {groups.map((g, i) => (
            <div key={i}>
              <h3 style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 20, color: "var(--p)", marginBottom: 18 }}>{g.name}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {g.items.map((it, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px dashed var(--line)", paddingBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: "var(--hf)", fontWeight: 600, fontSize: 16, color: "var(--tx)" }}>{it.name}</div>
                      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3, fontFamily: "var(--bf)" }}>{it.desc}</div>
                    </div>
                    <div style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 16, color: "var(--p)", whiteSpace: "nowrap" }}>{it.price}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const images = d<string[]>(s, "images", []);
  return (
    <section style={{ paddingBlock: 64 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(140), gap: 14 }}>
          {images.map((im, i) => (
            <img key={i} src={im} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "var(--rad)", display: "block" }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Process({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const steps = d<{ step: string; title: string; desc: string }[]>(s, "steps", []);
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(180), gap: 24 }}>
          {steps.map((st, i) => (
            <div key={i}>
              <div style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: 40, color: "color-mix(in srgb, var(--p) 30%, transparent)", letterSpacing: "-0.03em" }}>{st.step}</div>
              <h3 style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 19, marginTop: 8, color: "var(--tx)" }}>{st.title}</h3>
              <p style={{ marginTop: 8, fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55, fontFamily: "var(--bf)" }}>{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const members = d<{ name: string; role: string; avatar: string }[]>(s, "members", []);
  return (
    <section style={{ paddingBlock: 64 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(180), gap: 24 }}>
          {members.map((m, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <img src={m.avatar} alt="" style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: "var(--rad)", display: "block" }} />
              <div style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 17, marginTop: 14, color: "var(--tx)" }}>{m.name}</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 2 }}>{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const quote = d(s, "quote", "");
  const author = d(s, "author", "");
  const role = d(s, "role", "");
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={{ ...container, maxWidth: 860, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 24, color: "var(--p)" }}>
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={18} fill="currentColor" />)}
        </div>
        <Editable as="p" ctx={ctx} target={{ sectionId: s.id, kind: "text", field: "quote", label: "Quote", value: quote }}
          style={{ fontFamily: "var(--hf)", fontWeight: 500, fontSize: "clamp(22px,2.6vw,32px)", lineHeight: 1.35, letterSpacing: "-0.02em", color: "var(--tx)", margin: 0 }}>
          “{quote}”
        </Editable>
        <div style={{ marginTop: 24, fontSize: 14.5, color: "var(--muted)", fontFamily: "var(--bf)" }}>
          <strong style={{ color: "var(--tx)" }}>{author}</strong> · {role}
        </div>
      </div>
    </section>
  );
}

function Pricing({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const plans = d<{ name: string; price: string; period?: string; features: string[]; featured: boolean }[]>(s, "plans", []);
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={container}>
        <SectionTitle s={s} ctx={ctx} />
        <div style={{ ...cols(220), gap: 20 }}>
          {plans.map((p, i) => (
            <div key={i} style={{ padding: 28, borderRadius: "calc(var(--rad) + 4px)", border: p.featured ? "1.5px solid var(--p)" : "1px solid var(--line)", background: p.featured ? "color-mix(in srgb, var(--p) 6%, var(--card))" : "var(--card)", position: "relative" }}>
              {p.featured && <span style={{ position: "absolute", top: -11, left: 24, background: "var(--p)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>Rekomanduar</span>}
              <div style={{ fontFamily: "var(--hf)", fontWeight: 700, fontSize: 18, color: "var(--tx)" }}>{p.name}</div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: 36, letterSpacing: "-0.03em", color: "var(--tx)" }}>{p.price}</span>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>{p.period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--muted)", fontFamily: "var(--bf)" }}>
                    <Check size={16} style={{ color: "var(--p)", flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24 }}>
                <span style={{ ...buttonStyle(ctx.theme.buttonStyle, p.featured ? "primary" : "secondary", ctx.theme), width: "100%", justifyContent: "center" }}>Zgjidh</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const title = d(s, "title", "");
  const subtitle = d(s, "subtitle", "");
  const button = d(s, "button", "");
  return (
    <section style={{ paddingBlock: 40 }}>
      <div style={{ ...container }}>
        <div style={{ borderRadius: "calc(var(--rad) + 8px)", background: "var(--p)", color: "#fff", padding: "56px 48px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--hf)", fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ marginTop: 12, fontSize: 17, opacity: 0.85, fontFamily: "var(--bf)" }}>{subtitle}</p>}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
            <span style={{ background: "#fff", color: "var(--p)", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: ctx.theme.buttonStyle === "pill" ? 999 : "var(--rad)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {button} <ArrowRight size={16} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ s, ctx }: { s: WebsiteSection; ctx: Ctx }) {
  const title = d(s, "title", "");
  const email = d(s, "email", "");
  const phone = d(s, "phone", "");
  const address = d(s, "address", "");
  const rows: { icon: LucideIcon; label: string }[] = [];
  if (email) rows.push({ icon: Mail, label: email });
  if (phone) rows.push({ icon: Phone, label: phone });
  if (address) rows.push({ icon: MapPin, label: address });
  return (
    <section style={{ paddingBlock: 72 }}>
      <div style={{ ...container, ...cols(300), gap: 48, alignItems: "center" }}>
        <div>
          <SectionTitle s={s} ctx={ctx} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15.5, color: "var(--tx)", fontFamily: "var(--bf)" }}>
                <span style={{ width: 40, height: 40, borderRadius: "calc(var(--rad) * .7)", background: "color-mix(in srgb, var(--p) 12%, transparent)", color: "var(--p)", display: "grid", placeItems: "center" }}>
                  <r.icon size={18} />
                </span>
                {r.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 28, borderRadius: "calc(var(--rad) + 4px)", border: "1px solid var(--line)", background: "var(--card)", display: "flex", flexDirection: "column", gap: 12 }}>
          {["Emri", "Email", "Mesazhi"].map((f, i) => (
            <div key={i} style={{ height: f === "Mesazhi" ? 88 : 46, borderRadius: "var(--rad)", border: "1px solid var(--line)", background: "color-mix(in srgb, var(--tx) 3%, transparent)", padding: "12px 14px", fontSize: 13.5, color: "var(--muted)", fontFamily: "var(--bf)" }}>{f}</div>
          ))}
          <span style={{ ...buttonStyle(ctx.theme.buttonStyle, "primary", ctx.theme), justifyContent: "center", marginTop: 4 }}>Dërgo</span>
        </div>
      </div>
    </section>
  );
}

const RENDERERS: Record<string, (p: { s: WebsiteSection; ctx: Ctx }) => React.JSX.Element | null> = {
  hero: Hero,
  logos: Logos,
  features: Features,
  services: Services,
  work: Work,
  menu: Menu,
  gallery: Gallery,
  process: Process,
  team: Team,
  stats: Stats,
  about: About,
  testimonial: Testimonial,
  pricing: Pricing,
  cta: CTA,
  contact: Contact,
};

export function renderSection(s: WebsiteSection, ctx: Ctx) {
  const R = RENDERERS[s.kind];
  if (!R) return null;
  return <R key={s.id} s={s} ctx={ctx} />;
}
