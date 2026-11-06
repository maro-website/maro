export const IMAGE_COMPLEXITIES = ["low", "medium", "high"] as const;
export type ImageComplexity = typeof IMAGE_COMPLEXITIES[number];
export type NativeImageFormat = "svg" | "gif";

/** Percentages of the displayed reference, independent of screen and file dimensions. */
export interface ImageMarkupZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Image26Options {
  complexity?: ImageComplexity;
  outputFormat?: NativeImageFormat;
  markup?: ImageMarkupZone;
}

export interface Image26Features {
  complexity: boolean;
  markup: boolean;
  svg: boolean;
  gif: boolean;
  svgCredits?: number;
  gifCredits?: number;
}

export interface NativeImageAsset {
  format: NativeImageFormat;
  reference: string;
  url?: string;
}

export function isNativeImageFormat(value: unknown): value is NativeImageFormat {
  return value === "svg" || value === "gif";
}

export function nativeImageReference(previewRef: string, format: NativeImageFormat): string | undefined {
  if (!/^storage:generations\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/output\.png$/i.test(previewRef)) return undefined;
  return previewRef.replace(/\.png$/, `.${format}`);
}
