export interface InspirationItem {
  id: string;
  imageUrl: string;
  label?: string;
  category?: string;
}

const LOCAL = "/images/hub/marketing-stack.png";

/** Curated inspiration cards for maroImazh landing carousel (local assets). */
export const IMAZH_INSPIRATION: InspirationItem[] = [
  { id: "1", imageUrl: LOCAL, category: "Drinks" },
  { id: "2", imageUrl: LOCAL, category: "Product" },
  { id: "3", imageUrl: LOCAL, category: "Ads" },
  { id: "4", imageUrl: LOCAL, category: "Brand" },
  { id: "5", imageUrl: LOCAL, category: "Food" },
  { id: "6", imageUrl: LOCAL, category: "Fashion" },
  { id: "7", imageUrl: LOCAL, category: "Tech" },
  { id: "8", imageUrl: LOCAL, category: "Coffee" },
  { id: "9", imageUrl: LOCAL, category: "Retail" },
  { id: "10", imageUrl: LOCAL, category: "Social" },
];

export const MARO_IMAGE_URL_MIME = "application/x-maro-image-url";
