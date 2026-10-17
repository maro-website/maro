export type LogoBackdrop = "auto" | "light" | "dark";
/** Compare visible pixels against two display mats; the stored artwork is unchanged. */
export function chooseLogoBackdrop(pixels: ArrayLike<number>): Exclude<LogoBackdrop, "auto"> {
  let light = 0, dark = 0;
  const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const weight = pixels[index + 3] / 255;
    if (weight < 0.08) continue;
    const luminance = 0.2126 * linear(pixels[index] / 255) + 0.7152 * linear(pixels[index + 1] / 255) + 0.0722 * linear(pixels[index + 2] / 255);
    light += weight * Math.log(1.05 / (luminance + 0.05));
    dark += weight * Math.log((luminance + 0.05) / 0.05);
  }
  return dark > light ? "dark" : "light";
}
