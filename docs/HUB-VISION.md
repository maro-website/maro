# Maro Hub — creative studio experiment

Local route: http://localhost:3006/hub-vision

## Main Hub integration

The user subsequently requested pushing this version and preserving a local rollback copy. `HomeHub.tsx` now renders `HubVision` inside the existing site's `AppShell`; the Hub component adds no extra navigation or footer. `/hub-vision` remains a standalone development-only preview. The greeting uses the signed-in profile's display name and avatar, with an initial fallback if the avatar is absent; no example account is injected.

The release is prepared from GitHub `main` at `111991f6` and includes only the Hub components/assets, the standalone preview, the small release-metadata module, this report, and the `HomeHub` integration. Existing unrelated working-directory changes are excluded. The earlier no-production-integration statements below describe the original experimental scope, before this later explicit push request.

Rollback: restore `src/components/app/HomeHub.tsx` from `111991f6`, commit, and push normally. Original Hub dependencies remain unchanged. A separate local backup also preserves the original Hub files and the earlier Hub Lab experiment, with hashes and restoration instructions.

## Latest revision — simplified standalone Hub

The maroFilma study now uses the user-supplied `maroFilma-videotest01920123.mp4`, copied to `public/videos/hub-vision/maro-filma.mp4`. `FilmaPreview.tsx` renders an edge-to-edge looping autoplay video, muted by default, with inline mobile playback, no native controls, one mute/unmute button, and the requested `generated with maroFilma` badge. The original source file is unchanged. This supersedes the initial no-autoplay choice below; it does not enable the future Filma generation tool.

The user's follow-up supersedes the initial presentation described below. The experiment now renders a standalone main surface without `AppShell`, global navigation, or its own footer. Its greeting is centered and shows the real profile avatar followed by the full profile display name; missing/failed avatars fall back to the initial, and anonymous visitors see only the greeting. The actual signed-in workspace selector remains available below the greeting.

Removed: the Hub/studio breadcrumb, guest sign-in invitation, greeting subtitle, inspiration shortcut, numbered tool labels, creation-tool descriptions, ecosystem eyebrow/supporting sentence, and preset eyebrow/supporting sentence. The ecosystem heading is exactly `Ma shume se veq ni imazh:`.

Upcoming tools now use the same two-column proportions, rounded media surface, and white name/action band as the available tools. The new shared `src/components/hub-vision/ToolFooter.tsx` renders creation links for live tools and release status for upcoming tools. Mobile uses a single-column composition. No global layout, production route, or generation code was changed.

This is a new development-only route. `/`, `/hub-lab`, authentication, payments, generation pipelines, schemas, production infrastructure, and existing tools are unchanged. The route returns `notFound()` outside development. Nothing was deployed. The earlier Hub Lab visual design and the Erzen skill were not used.

## What changed

A creation-first Hub with two art-directed entrances: an original blue botanical campaign for maroImazh, and an interactive identity study for maroLogo. The surrounding interface remains light and uses Maro's existing typography, blue, ink, surface, border, and focus tokens. Illustration colors are scoped to the artwork rather than redefining the app theme.

## Audit and existing systems reused

- Current Hub: `src/components/app/HomeHub.tsx`, rendered by `src/app/page.tsx`.
- Layout/navigation: existing `AppShell`, `AppTopNav`, mobile `NavDrawer`, notices, account controls, and footer policy. The experiment does not duplicate navigation.
- Tokens/type: `maro-final-design-system/tokens/maro-final.css`, the `maro-system` brand assets, and the already-loaded Manrope font. Instrument Serif is used only inside a miniature fictional film poster.
- User identity: `useMaro().user.name`; the first name is dynamic. Anonymous visitors get an unpersonalized greeting.
- Workspaces: `useWorkspace().workspaces`, `activeWorkspace`, `setActiveWorkspace`; the existing persistence is reused. No account/workspace data is mocked.
- History: `useMaro().creations` and `activeWorkspaceScope`. Workspace changes hide stale continuity before the new slice becomes available.
- Presets: `fetchPrompts`, `fetchPromptDetail`, `PromptItem`, `PRESET_TOOL_META`, `PROMPT_ATTACH_KEY`, and the existing session-storage tool handoff.
- Tool routes: `/imazh`, `/marologo`, `/prompts?tool=imazh`, `/prompts?tool=logo`, `/krijimet`, and the existing `/imazh?open=<id>` result view.
- Release policy: `MODULE_AVAILABILITY` supplies product names and versions.
- Media: official `/brand/maro-logo.svg`, existing `StableImage` for catalog/history media, one new optimized original WebP, and native SVG/CSS illustration.
- Localization: this repository uses direct Albanian UI strings rather than a general locale catalog. Core experiment copy is centralized in `content.ts`; no localization infrastructure was added.
- Motion: Framer Motion is already installed, but the new Hub uses CSS transitions only. No new dependencies.

## UX architecture and hero

1. A quiet context line identifies Hub and the active workspace.
2. The dynamic greeting leads directly into the two tool entrances.
3. Real, reopenable Imazh results appear in a compact continuity strip, maximum three on desktop and two on smaller screens.
4. Four small upcoming-tool studies introduce the wider ecosystem.
5. Optional presets offer a concrete starting point.

The image canvas is clickable as well as its labeled creation action. The identity artwork is also a link; its palette controls are separate buttons with pressed state. Changing a palette affects the illustrative identity study only. It does not change the user's workspace brand or preconfigure a generation. Both example surfaces are labeled as examples.

## Daily use

No animation gates creation. Each primary tool is one click away. Workspace switching uses a native keyboard-accessible select. Continuity is absent when there is no useful data. Preset tool selection is remembered as a device-local preference, with storage failures safely ignored.

## Ecosystem

Web, Filma, Audio, and Marketing use distinct small visual studies: a website, a film frame, a waveform, and a campaign composition. They are noninteractive previews with release badges, not fake live tools. Web is v1.5; the other three are v2. Shared metadata and rendering allow additional products without copying entire sections.

## Presets

The Hub requests up to five records per live tool through the existing catalog service. It preserves the API's deterministic order: featured first, then ascending editorial `sort_order`, then newest `created_at`. It does not claim personalized or global popularity ranking. Fewer than five available records remain fewer than five.

Preset use fetches current detail, validates tool/target compatibility, stores the canonical attach payload, then navigates to the existing tool. Failures show the existing toast and allow retry. Catalogs with fewer than three records use compact rows; missing preview media gets a text treatment from real category metadata. Entirely empty catalogs collapse to a single catalog invitation.

## Responsive behavior

Desktop uses a 1.52:1 launch composition. Tablet keeps both doors side by side and puts upcoming products in a two-column layout. At 600px and below, the image door remains a compact campaign and the identity study recomposes into a horizontal strip. Both creation actions stay near the top. Presets become a touch-scroll strip; small catalogs retain compact rows.

## Performance and accessibility

The original 1440 × 960 hero WebP is 315,156 bytes before Next image optimization. Its geometry is reserved, it uses responsive `sizes`, and it is prioritized. Below-fold real images use `StableImage` lazy loading. No autoplay video, timers for decorative motion, animation package, cursor tracker, new dependencies, or backdrop blurs were introduced. CSS respects reduced motion. Controls use semantic links/buttons/selects, visible focus, accessible names, and pressed states. This route restores pinch zoom through its own viewport metadata without changing the app's global viewport.

## New components and exact files

All files below were added, not replacements for existing Hub files:

- `src/app/hub-vision/page.tsx` — local route, metadata, production guard, zoom settings.
- `src/components/hub-vision/HubVision.tsx` — composition, workspace context, continuity.
- `src/components/hub-vision/Launchpad.tsx` — creation doors, identity study, shared identity mark.
- `src/components/hub-vision/Ecosystem.tsx` — extensible roadmap studies.
- `src/components/hub-vision/PresetDiscovery.tsx` — real catalog and tool handoff.
- `src/components/hub-vision/content.ts` — primary copy, palettes, product metadata.
- `src/components/hub-vision/data.ts` — scoped, valid, reopenable history selection.
- `src/components/hub-vision/data.test.ts` — continuity boundary tests.
- `src/components/hub-vision/HubVision.module.css` — fully scoped layout, responsiveness, interactions.
- `public/images/hub-vision/blue-bloom.webp` — original campaign artwork.
- `docs/HUB-VISION.md` — this implementation report.

## Deferred opportunities

- Logo result reopening: the current wizard does not consume `?open=`. The existing generic history URL helper does not guarantee supported behavior, so Logo is deliberately excluded from the Hub's continuation strip. Fixing the wizard belongs to a separate functional change.
- True draft continuation: the current Imazh link reopens an existing result in a read-only conversation. The Hub does not pretend to restore unsaved generation drafts.
- Reordering the hero by last-used tool: no reliable dedicated signal was needed or added. Stable spatial memory is preferable here.
- Conceptual "start with" shortcuts: rejected because they duplicate the two primary entrances and presets.
- Personalized recommendation infrastructure, synthetic activity, future-tool interactions, waitlists, and API/schema changes: outside this experiment.
- Full authenticated workspace switching requires a signed-in account for interactive verification. The provider is reused and continuity isolation has automated coverage; no fabricated login state was added.
- Existing Imazh development-mode preset handoff: browser verification reached the correct tool, but its attached-preset chip did not persist. `ToolComposer` consumes and removes `PROMPT_ATTACH_KEY` in a mount effect, then resets attachment to null when the effect runs again under the existing `reactStrictMode: true` configuration. The Hub uses the same canonical contract as the current preset catalog. The Logo handoff was visibly verified; Imazh's receiving-tool issue remains outside this Hub-only change. No generation was started during testing. Fixing the receiver to consume its handoff idempotently is a separate tool fix.

## How to test

Use the existing development server on port 3006 and open `/hub-vision`.

1. Signed out: greeting contains no invented name; no fake recent work appears.
2. Signed in: greeting uses the first name, select shows real workspaces, and switching updates the existing workspace context.
3. Activate either artwork or creation button: the matching existing tool opens, with no generation automatically started.
4. Tab to the three identity swatches and use Space/Enter: selected state and all identity applications update together.
5. Switch Imazh/Logo presets: real catalog entries change, selection persists on return, and the catalog link follows the selected tool.
6. Use a real preset: the selected preset is attached in the existing tool. No credit is spent by the Hub.
7. With real Imazh history: at most three newest scoped creations appear. Reopen one. Switch workspace and check old results disappear during loading. Logo-only history produces no false resume links.
8. Inspect 1440px desktop, 1024px laptop, 768px tablet, 390px phone, and 320px narrow phone layouts. Confirm no horizontal page overflow and both entrances remain usable.
9. Check keyboard focus, browser zoom, and OS reduced-motion mode.
10. A production build must not expose `/hub-vision`.

Validation: TypeScript no-emit check passed. 55 targeted tests passed across Hub data boundaries (4), existing multi-tool preset contracts (9), and module availability (42). Visual browser checks include 1440px desktop, 1024px laptop, 768px tablet, 390px phone, 320px narrow phone, palette state, actual preset catalog data, and the existing tool entry routes. Logo's selected-preset attachment was visibly confirmed; the separate Imazh receiver issue is documented above. Narrow-phone and standard-phone checks reported no horizontal document overflow. A server/client waveform float-serialization mismatch discovered in the browser was corrected by rounding decorative bar heights to integer pixels. The release checkout passed a full Next.js production build and 13 targeted Hub/preset tests. The build reported one existing hook-dependency warning in src/components/app/cards.tsx.

## Original artwork provenance

Created with the built-in image-generation tool, then converted to a project-owned optimized WebP. This is an explicitly illustrative creative direction, not a claimed user generation.

Final prompt:

> Use case: ads-marketing. Create one exceptional premium art-directed photographic artwork for Maro, a creative AI studio. Landscape 1536x1024 composition. A single enormous impossible cobalt blue calla lily, sculptural folded matte blue petals with intricate organic curves, one luminous tangerine orange spadix, long elegant curved forest-green stem and single leaf. Flower fills center and right 70% of frame, dramatically angled across frame. Light pale buttery yellow seamless studio backdrop, clean sunny flat color #f2edbd. Hard afternoon sun from top left casts a very distinct elegant botanical shadow toward lower right across background. Editorial botanical still life meets luxury perfume advertising, tangible real materials, subtle film grain, crisp shape, outstanding color and precise sculptural detail, art direction by a world-class creative studio. Mostly warm yellow negative space on left 25% for separate HTML text. NO text, NO lettering, NO watermark, NO UI, NO borders, NO logos, not a website screenshot. Final artwork is an explicitly illustrative creative direction example, not a real user generation.
