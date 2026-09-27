-- maroLogo identity intelligence: strengthen the canonical server-side option
-- fragments. No new columns are required; the existing selections/final_prompt/
-- fort JSON metadata already captures the richer brief and presentation mode.

update public.app_settings
set tool_prompts = coalesce(tool_prompts, '{}'::jsonb) || jsonb_build_object(
  'logo.base', 'You are maroLogo, an expert identity designer. Translate the structured brief into one distinctive, coherent brand identity with vector-like clarity, strong silhouette, disciplined typography and professional spacing. Follow the selected presentation mode exactly. Multiple views must always show the same identity system, never unrelated concepts. Avoid stock-logo clichés, decorative clutter, watermarks and invented text.',
  'logo.type.typography', 'Architecture: wordmark only. Make the exact brand name the identity through bespoke letterforms, kerning and rhythm; do not add a separate icon.',
  'logo.type.symbol', 'Architecture: symbol led. Prioritize one compact, memorable silhouette that works at small size; the brand name is context unless the presentation explicitly calls for an identity-system view.',
  'logo.type.both', 'Architecture: unified symbol plus wordmark. The same symbol and the same exact-name typography must work together and independently.',
  'logo.present.bw', 'Presentation priority: BLACK & WHITE. Judge form and recognizability on a plain high-contrast field; no mockup, texture or color.',
  'logo.present.color', 'Presentation priority: COLOR. Show one clean, controlled identity presentation with a disciplined palette and no marketing clutter.',
  'logo.present.mockup', 'Presentation priority: LOGO MOCKUP. Select one premium real-world application that is genuinely relevant to the business context; avoid a generic wall mockup when a better application exists.',
  'logo.present.bento', 'Presentation priority: BENTO GRID. Show several views of ONE cohesive identity system in one art-directed image. Keep the core symbol, wordmark letterforms, spelling, palette and design logic identical across every module. This is not a sheet of alternative logo concepts.'
)
where id = 1;

notify pgrst, 'reload schema';
