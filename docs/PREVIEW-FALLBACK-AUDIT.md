# Maro preview fallback audit

Date: 2026-09-16. Scope: the primary `maro-al` checkout, including source, public assets, styles, migrations, API handlers, storage/service adapters, and shared UI. The separate MCP worktree and release/build copies were not edited. Existing unrelated working changes were preserved.

## Original placeholder inventory

The generic illustration is **`public/images/hub/marketing-stack.png`**, served at `/images/hub/marketing-stack.png`. It contains colorful overlapping Maro-branded cards.

| Location | Original use | Replacement |
| --- | --- | --- |
| `src/lib/modules/imazh/inspiration.ts` | `LOCAL` constant, 10 offline/default tiles, exported `IMAZH_INSPIRATION_FALLBACK_IMAGE` | Empty preview values; no fabricated image URL |
| `src/components/modules/ImazhWorkspace.tsx` | `p.featured_url || IMAZH_INSPIRATION_FALLBACK_IMAGE`; initializes carousel with default tiles | Keeps actual URL or empty value; skeleton while fetching |
| `src/components/modules/InspirationCarousel.tsx` | Renders each supplied image and supports preset attachment/dragging | Shared image states, module context; empty non-preset tiles cannot be dragged |
| `src/lib/modules/brand/inspiration.ts` | Six hardcoded illustration URLs | Empty preview values |
| `src/components/modules/BrandWorkspace.tsx` | Displays Brand inspiration through the carousel | Passes Brand context for the shapes icon |
| `src/lib/modules/web/inspiration.ts` | Six URLs through `LOCAL`; currently no consumers | Empty preview values, preventing future reuse of illustration defaults |
| `src/components/hub/hubTools.ts` | Five tool background URLs | No fabricated background URLs |
| `src/components/app/HomeHub.tsx` → `src/components/hub/HubToolTile.tsx` | Passes backgrounds to image-backed hover previews | Contextual small icons; actual supplied backgrounds remain supported |
| `src/components/hub/MarketingBanner.tsx` | Explicit promotional artwork; its error handler hides the artwork | Retained: this is marketing content, not a missing-preview fallback |

No hardcoded ES image imports or CSS `background-image` declarations reference this PNG. Hub `backgroundImage` is a component property rendered as an `<img>`. The old hub preview gradient rules are no longer applied to the contextual fallback. The preset card's radial-gradient empty state was removed.

## Other preview and fallback implementations reviewed

| Location | Change |
| --- | --- |
| `src/components/app/StableImage.tsx` | Centralizes loading, empty, and failed image display; preserves bounded signed-asset refresh recovery |
| `src/components/app/PreviewFallback.tsx` | New single fallback presentation component; presentation-only filtering of the historical placeholder path |
| `src/components/app/GenerationCard.tsx` | Removes `/brand/maro-symbol.svg` watermark and branded animation inside the preview; preserves aspect ratio, generation errors/actions, and real output |
| `src/components/app/GenerationLoader.tsx` | Unused compatibility loader now renders a plain skeleton |
| `src/components/marologo/MaroLogoGenerating.tsx` | Plain preview skeleton |
| `src/components/marologo/MaroLogoResult.tsx` | Shared image loading/empty/error handling |
| `src/components/app/cards.tsx` | Creation thumbnails, list rows, lightbox, lightbox image selector, and project cards |
| `src/app/krijimet/page.tsx` | Replaces separate `CreationImage` error handler and colored project initials with shared preview behavior |
| `src/components/website-previews/PreviewThumb.tsx` | Saved screenshot first; retains actual website rendering when available; empty/loading fallback when no content exists |
| `src/components/dashboard/ProjectCard.tsx` | Uses the shared project preview instead of a separate spinner/text placeholder |
| `src/components/modules/WebWorkspace.tsx` | Recent project previews use the shared project renderer |
| `src/app/projects/[projectId]/generating/page.tsx` | Web screenshot uses contextual shared image states; keeps real HTML preview; replaces indefinite thumbnail-preparation text when no preview exists |
| `src/components/presets/PresetCard.tsx` | Shared module-specific previews; removes gradient and oversized icons |
| `src/app/prompts/page.tsx` | Preset detail preview and catalog-loading skeletons |
| `src/components/admin/presets/MaroPresetsWorkspace.tsx` | Preset list/editor preview states |
| `src/components/hub/RecentPresets.tsx` | Shared loading and failed-preview handling |
| `src/components/app/PromptAccessoryRow.tsx` | Compact attached-preset thumbnail |
| `src/components/app/ToolComposer.tsx` | Passes preset module context; existing private-reference refresh/error callbacks remain intact |

Brand assets used as navigation, user identity, promotional artwork, and status indicators outside preview areas are not generic missing-preview images. Customer website contents, generation prompts, uploads, and unrelated images were not rewritten.

## Data and API findings

- No occurrence of the generic PNG in API handlers, database migrations, or storage/service fallbacks.
- Preset `featured_url` is nullable; list/detail APIs resolve existing media or return `null`.
- Existing project thumbnail and creation URL resolution preserves canonical storage references and signed display URLs. Those paths were not modified.
- Existing `StableImage` errors request asset refresh; they did not substitute a decorative image. Krijimet used its own terminal-error UI. These now share fallback presentation.
- No live database contents were inspected or migrated. Historical placeholder URLs reaching `StableImage` are treated as empty at render time only.

## Behavior and visual rules

- **Loading:** plain surface skeleton, inherited radius, existing dimensions/aspect ratio, no visible text/icon/branding/gradient; respects reduced motion.
- **Empty:** existing `surface`/`ink-3` tokens and a centered 22px Lucide line icon at 40% opacity. Image, shapes, browser, file, audio, or video based on context.
- **Failed URL:** muted unavailable icon with an accessible label; does not assign a replacement image URL.
- **Real preview:** actual source retained, including URL signatures, blob URLs, and data URLs. Existing contain/cover alignment retained.
- **Recovery:** one asset-refresh attempt per canonical identity when provided; display state resets for new URLs. Timers and asynchronous callbacks from unmounted previews cannot hide replacements. A refresh that returns the same broken URL reaches the error state instead of remaining loading forever.
- **Theme:** this checkout's active design system is explicitly light-only. The implementation uses its existing semantic tokens without adding another theme; it follows those same tokens wherever configured differently.

## Validation

- TypeScript check: passed.
- Focused tests: 73 passed across preview fallback, multi-tool presets, image reference pipeline/security, and Web parity.
- Headless Chrome using the actual React components and compiled project Tailwind tokens: empty/legacy URLs, loading skeleton, successful image, broken URL, no repeated requests, URL replacement, stale timer isolation, canonical retry budget, unchanged refreshed URL, icon dimensions, and 128px preview height passed. No browser errors.
- Visual inspection: full-card and 34px compact fallbacks render without decorative artwork or layout overflow.
- Final source audit: the PNG remains only in the intentional marketing banner, the presentation-only legacy-path filter, and its regression test. The asset was retained.

Authenticated end-to-end generation and live storage/database operations were not exercised; their implementation was not changed.
