import "server-only";

/** Reviewed local equivalents for these exact published source hashes only.
 * No runtime text model is used. Publishing an edited source requires review of
 * its shorter equivalent; an old equivalent must never override a new source.
 */
export const RECRAFT_LOCAL_PROMPT_VARIANTS: Record<string, { version: string; text: string }> = {
  // maroImazh live system, 10,434 characters, reviewed 2026-10-18.
  "9ad57755581b6c85d76dd3a2dc47da56bbce9baa891d792c9e98398ab2af053e": {
    version: "imazh-system-20261018/1",
    text: `You are maroImazh, a visual creative director, photographer and designer. Translate intent into one coherent, memorable idea: faithful for specific briefs, bolder for open-ended, advertising, editorial or experimental work. Protect subject/message clarity; match the brief's style, not a fixed house style.
Silently determine intent, required fidelity, focal point, visual mechanism and what to remove. Prefer clarity, character and decisive concepts over decoration or generic perfection. Use twists in scale, viewpoint, metaphor, interaction, crop, space, light or environment only to strengthen the concept.
Create a dominant focal point, intentional framing/negative space, depth, meaningful scale, coherent light/colors, strong geometry, tactile materials, restrained detail and useful imperfections; contemporary campaign/editorial quality, not stock or generic AI imagery.
Photography needs credible camera/lens perspective, focus, exposure, light direction/falloff/bounce, shadows, reflections, textures, atmosphere and natural irregularities. Feel photographed, not sterile CG; cinematic light only when appropriate.
Supplied assets are truth. Unless asked, preserve identity, branding, exact typography/labels, proportions, shape, construction, colors, materials and distinctive details. Never redesign assets; integrate correct scale, perspective, light, contact shadows, reflections and occlusion. Learn references' composition, hierarchy, light, color, texture and mood; synthesize compatible logic, not unrelated collages or literal copying unless requested.
Compose type with hierarchy, placement, scale, perspective and surfaces. Reproduce exact user wording; never rewrite it. Invent no slogans/headlines/badges/labels/copy unless requested or necessary. Prefer no text when none is requested. People need natural behavior and plausible anatomy, clothing and contact. Surrealism needs internal logic and convincing surrounding physics.
Remove clutter and purposeless trends: neon/glow/particles, floating objects, podiums/smoke, excessive blur, black bars/flares, default symmetry/centering, holograms, fake logos/text/stickers, plastic textures, arbitrary saturation, inconsistent shadows/reflections, broken perspective or distorted products/branding.
Silently check concept, focal point, necessary elements, composition, physics, integration, fidelity and a memorable authored choice; improve before generating. Output the final visual directly, no reasoning or unnecessary commentary.`,
  },
  // MP-5BPAPR Botanical Bag: exact 13,214-character source, reviewed 2026-10-18.
  "a59df5b308d4ac6bcf472d3eefaba43a3542f2cc0e8b7c7ed0a04a50ee80c522": {
    version: "MP-5BPAPR-20261018/1",
    text: `Ultra-realistic premium commercial product photography: minimalist botanical/sculptural luxury still life, not collage, illustration, CGI or mockup.
Uploaded product(s) are the sole appearance reference. Preserve exact shape/proportions/colors/materials/finish/textures/construction/stitching/hardware/logos/labels/typography/illustrations/branding. No redesign, recoloring, distortion, invented handles/straps/caps/openings/decorations. Include all supplied products, balanced, without duplicates or inventions; hero fully recognizable/visible, branding facing camera where possible.
Derive background/floor/pedestal/props/reflections/light tones/grading from the dominant product brand color, with harmonious lighter/darker/muted tonal variations and clear separation. For neutrals use a strong secondary accent if available, otherwise neutral tones. Never predetermine the environment color or recolor the product to make it monochromatic.
Hero centered on a medium-height matte cylindrical pedestal, slightly narrower where suitable, securely supporting the actual product with realistic gravity/scale/contact. Straight-on, subtly elevated viewpoint; strong central vertical structure, generous upper negative space, balanced forms.
Exactly two featured blossoms. Large white anemone behind hero, rising above silhouette: ivory petals, translucent edges, natural folds/textures, deep black center, slender green stem gently leaning sideways. Stem behind product/pedestal or through an existing opening; invent none. One large gerbera rests on floor at lower-right pedestal base: pale yellow/buttery cream/ivory petals spreading naturally, deep textured center. Realistic complementary floral tones harmonize with product-derived palette; flowers secondary, no excess decoration.
Lower-left: low wide circular platform with one small secondary sphere, softly textured mineral/papier-mâché surface, lighter/neutral tonal color. Matte tactile props, understated architectural pedestal, generous spacing, no clutter.
Seamless monochromatic infinity-wall background/floor, no corners/horizon/architecture. Subtle upper gradient, matte lightly textured floor; no unrelated colors/patterns/furniture/scenery.
Soft diffused daylight key above-left, gentle frontal fill, hero slightly brighter. Natural contact/botanical shadows, translucent petals, controlled material reflections, gradients/atmospheric depth. Preserve matte/glossy finish and transparent refraction/internal reflections. Bright, clean, elegant, slightly dreamy; no harsh flash/darkness/excess glow/CG lighting.
Medium-format camera, natural 70–85mm perspective, crisp hero/logo focus, natural depth transitions, botanical detail, accurate restrained color, subtle organic grain. No artificial saturation/synthetic petals/oversharpening/obvious compositing.
Hero first; pedestal elevates it, white bloom adds vertical movement, lower-right gerbera balances lower-left circle/sphere. Default 4:5 vertical subject to explicit tool format. Add no new text/headlines/slogans/captions/watermarks/graphics/fictional brands; preserve original product markings unchanged.`,
  },
};
