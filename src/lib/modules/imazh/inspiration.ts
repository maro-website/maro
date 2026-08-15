export interface InspirationItem {
  id: string;
  imageUrl: string;
  label?: string;
  category?: string;
}

/** Curated inspiration cards for maroImazh landing carousel. */
export const IMAZH_INSPIRATION: InspirationItem[] = [
  { id: "1", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=520&fit=crop", category: "Drinks" },
  { id: "2", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=520&fit=crop", category: "Product" },
  { id: "3", imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=520&fit=crop", category: "Ads" },
  { id: "4", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=520&fit=crop", category: "Brand" },
  { id: "5", imageUrl: "https://images.unsplash.com/photo-1611532736597-deb4c1a3a2b1?w=400&h=520&fit=crop", category: "Food" },
  { id: "6", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=520&fit=crop", category: "Fashion" },
  { id: "7", imageUrl: "https://images.unsplash.com/photo-1634942537034-2535987580e6?w=400&h=520&fit=crop", category: "Tech" },
  { id: "8", imageUrl: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=520&fit=crop", category: "Coffee" },
  { id: "9", imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96ed2f4a9f?w=400&h=520&fit=crop", category: "Retail" },
  { id: "10", imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e939e994?w=400&h=520&fit=crop", category: "Social" },
];

export const MARO_IMAGE_URL_MIME = "application/x-maro-image-url";
