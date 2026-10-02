import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { ToolIcon } from "@/components/app/OptionIcon";
import { UpcomingToolPreview } from "@/components/hub-vision/UpcomingToolPreview";
import { getProductBrand } from "@/lib/design/maro-system";
import { MODULE_AVAILABILITY } from "@/lib/modules/availability";
import s from "./UpcomingProductPage.module.css";

const CONTENT = {
  web: {
    motif: "web",
    title: "Jepi idesë\nnjë adresë.",
    description: "Nga një ide në një faqe web. maroWeb po përgatitet që prezenca e brandit tënd të marrë formë me Maron.",
    preview: "Një pamje nga ajo që po vjen: ide, dizajn dhe identitet në një faqe.",
    benefits: [
      { title: "Ideja jote", text: "Një drejtim i qartë për faqen." },
      { title: "Brandi yt", text: "Pamje që i përshtatet identitetit." },
      { title: "Faqja jote", text: "Një vend për ta prezantuar idenë." },
    ],
  },
  filma: {
    motif: "film",
    title: "Vëre idenë\nnë lëvizje.",
    description: "Ide që marrin jetë në video. maroFilma po përgatitet për tregime, skena dhe krijime që lëvizin me imagjinatën tënde.",
    preview: "Shiko një drejtim vizual nga Hub-i. Ky është vetëm një shikim i asaj që po përgatitet.",
    benefits: [
      { title: "Historia", text: "Nise me idenë që do të tregosh." },
      { title: "Lëvizja", text: "Jepi jetë drejtimit vizual." },
      { title: "Atmosfera", text: "Gjeje ritmin e krijimit tënd." },
    ],
  },
  audio: {
    motif: "audio",
    title: "Gjeje zërin\ne idesë tënde.",
    description: "Krijime që dëgjohen. maroAudio po përgatitet për zërin, muzikën dhe atmosferën që i japin një dimension tjetër idesë tënde.",
    preview: "Pamja e maroAudio nga Hub-i: një hapësirë për krijime që kanë zë.",
    benefits: [
      { title: "Zëri", text: "Një mënyrë tjetër për ta treguar idenë." },
      { title: "Muzika", text: "Gjeje ritmin që i përshtatet." },
      { title: "Atmosfera", text: "Jepi krijimit një ndjesi të vetën." },
    ],
  },
  marketing: {
    motif: "marketing",
    title: "Ide që gjejnë\nnjerëzit e duhur.",
    description: "Nga drejtimi kreativ te mesazhi i brandit. maroMarketing po përgatitet që idetë e tua të marrin formë për audiencën që do të arrish.",
    preview: "Një drejtim nga Hub-i për mesazhe, pamje dhe ide që punojnë bashkë.",
    benefits: [
      { title: "Drejtimi", text: "Një ide që e mban brandin në fokus." },
      { title: "Mesazhi", text: "Fjalë dhe pamje që punojnë bashkë." },
      { title: "Audienca", text: "Krijime për njerëzit që do të arrish." },
    ],
  },
} as const;

export function UpcomingProductPage({ moduleId }: { moduleId: keyof typeof CONTENT }) {
  const content = CONTENT[moduleId];
  const brand = getProductBrand(moduleId);
  const productModule = MODULE_AVAILABILITY[moduleId];
  if (!brand) return null;
  const brandStyle: CSSProperties & { "--product-accent": string } = { "--product-accent": brand.color };

  return <section className={s.page} style={brandStyle} aria-labelledby="product-preview-title">
    <div className={s.layout}>
      <div className={s.intro}>
        <ProductLogo product={brand.id} naturalWidth className={s.logo} />
        <p className={s.status}>Po marohet për {productModule.version}</p>
        <h1 id="product-preview-title">{content.title}</h1>
        <p className={s.description}>{content.description}</p>
        <div className={s.actions}>
          <Link href="/imazh" className="maro-button" data-variant="inverse" data-size="lg">Krijo me maroImazh<ArrowUpRight size={19} aria-hidden /></Link>
          <Link href="/" className={s.hubLink}>Kthehu në Hub</Link>
        </div>
        <p className={s.releaseNote}>{brand.displayName} vjen në {productModule.version}. Deri atëherë, vazhdo të krijosh me Maron.</p>
        <div className={s.benefits}>{content.benefits.map((benefit, index) => <div className={s.benefit} key={benefit.title}>
          <span className={s.benefitNumber} aria-hidden>0{index + 1}</span><strong>{benefit.title}</strong><p>{benefit.text}</p>
        </div>)}</div>
      </div>
      <section className={s.preview} aria-labelledby="product-release-title">
        <div className={s.media}><UpcomingToolPreview motif={content.motif} /></div>
        <div className={s.previewCopy}>
          <div className={s.cardHeading}><span className={s.productIcon}><ToolIcon toolId={brand.id} className="h-5 w-5" /></span><h2 id="product-release-title">Po përgatitet. Së shpejti këtu.</h2></div>
          <p>{content.preview}</p>
        </div>
      </section>
    </div>
  </section>;
}
