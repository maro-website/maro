declare module "fontkit" {
  export type Font = {
    familyName: string;
    unitsPerEm: number;
    ascent: number;
    descent: number;
    lineGap: number;
    hasGlyphForCodePoint(codePoint: number): boolean;
    layout(text: string): {
      glyphs: Array<{ path: { toSVG(): string }; bbox: { minX: number; minY: number; maxX: number; maxY: number } }>;
      positions: Array<{ xAdvance: number; xOffset: number; yOffset: number }>;
    };
  };
  export function create(buffer: Buffer): Font;
}
