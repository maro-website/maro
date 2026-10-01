# Case Studies: local implementation handoff

Repository: `C:/Users/nicep/Desktop/maro-al/maro-al`

## Local routes

- http://127.0.0.1:3006/case-studies
- http://127.0.0.1:3006/case-studies/noma-coffee

The development server is bound to loopback only. Start it from the repository
with `node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3006` if needed.
The installed package-command shims did not resolve `next`/`tsc`, so validation
used their installed Node entry points without changing dependencies.

## Created files

Paths below are relative to the repository above.

| Area | Files |
| --- | --- |
| Routes | `src/app/case-studies/layout.tsx`, `src/app/case-studies/page.tsx`, `src/app/case-studies/[slug]/page.tsx` |
| Components | `src/components/case-studies/CaseStudyArchive.tsx`, `CaseStudyDetail.tsx`, `CaseStudyTest.tsx`, `ComparisonViewer.tsx`, `PromptBlock.tsx`, `StudyImage.tsx`, `StudyPrimitives.tsx` |
| Styles | `src/components/case-studies/CaseStudies.module.css` |
| Data | `src/data/case-studies/types.ts`, `index.ts`, `noma-coffee.ts` |
| Tests | `src/data/case-studies/case-studies.test.ts`, `tests/case-studies.browser.mjs` |
| Documentation | `public/case-studies/noma-coffee/README.md`, `docs/CASE_STUDIES_LOCAL.md` |
| Original assets | The 14 files listed below: 12 renders, one attachment, one PDF |

All short component/data filenames in a table cell use the directory shown at
the beginning of that cell.

## Modified existing files

- `src/lib/nav/destinations.ts`: one Case Studies entry in the Hub menu; the
  existing desktop dropdown and mobile drawer both consume this list.
- `src/styles/maro-preview-dark.css`: extended the existing Hub dark palette's
  selector to match pages containing `[data-maro-case-studies]`. Color values
  were not changed. This file already existed as an untracked local file before
  this task. The feature does not change the user's stored theme preference.

## Asset placement: already complete

Asset root: `C:/Users/nicep/Desktop/maro-al/maro-al/public/case-studies/noma-coffee`

| Test | ChatGPT / High | Gemini / Nano Banana Pro | maro.al v1 / OFF | maro.al v1 / ON |
| --- | --- | --- | --- | --- |
| Product Hero | `renders/test-01/test01-chatgpt.png` | `renders/test-01/test01-nanobananapro.jpg` | `renders/test-01/test01-maro-marobrainoff.png` | `renders/test-01/test01-maro-marobrainon.png` |
| Lifestyle | `renders/test-02/test02-chatgpt.png` | `renders/test-02/test02-nanobananapro.jpg` | `renders/test-02/test02-maro-marobrainoff.png` | `renders/test-02/test02-maro-marobrainon.png` |
| Creative Campaign | `renders/test-03/test03-chatgpt.png` | `renders/test-03/test03-nanobananapro.jpg` | `renders/test-03/test03-maro-marobrainoff.png` | `renders/test-03/test03-maro-marobrainon.png` |

- Product attachment: `input/NOMA_PACKAGING_ATTACHMENT.png`.
- Evidence: `evidence/maro-casestudy-01.pdf`.
- Additional reviewed screenshots/PDFs belong in `evidence/`; register them in
  the data object's `evidence` array. Example: `evidence/test01-chatgpt-settings.png`.
- The manifest is `src/data/case-studies/noma-coffee.ts`.
- No placeholders are currently needed. Image failures still have a graceful,
  explicitly labeled filename fallback.
- All 13 images and the PDF were verified with SHA-256 against the supplied
  originals. The originals are unchanged. No PDF-extracted images are used.

## Reusable components and interactions

- `CaseStudyArchive`: module filters, computed statistics, editorial cards,
  valid empty filters, and future-study teasers.
- `CaseStudyDetail`: the data-driven experiment page.
- `CaseStudyTest` and `OutputCard`: exact prompts, four outputs, metadata,
  two-output selection scoped to a single test.
- `PromptBlock`: clipboard copy, live success feedback, readable failure state.
- `ComparisonViewer`: native accessible modal, selectable A/B setups, original
  image files, side-by-side comparison, native-resolution inspection, and an
  optional keyboard-operable divider for exactly equal dimensions.
- `ExperimentMatrix`: semantic table with correctly mapped image inspection.
- `StudyEvidence`: expandable provenance, setup labels, complete prompts, links.
- `StudyImage`: Next Image optimization, responsive sizing, lazy loading,
  reserved dimensions, original-quality viewer mode, missing-asset fallback.
- `StudyStats`, `FutureStudies`, and `StudyFooter`: shared archive/detail pieces.

The existing `AppShell`, `AppTopNav`, `HubDropdown`, and `NavDrawer` are reused.
The design uses the current Hub's Manrope, semantic colors, flat surfaces,
green accent, border radii, and interaction language. The native modal was used
because the existing shared modal is too narrow for inspection and does not
provide focus containment. That existing modal was not modified.

## Responsive and accessibility behavior

- Four columns at 1100px and above.
- Below 1100px, a deliberate horizontal snap rail with large output panels;
  mobile panels occupy 84% of the rail so the next image is visible.
- Sticky test navigation with contained horizontal scrolling on small screens.
- Desktop/tablet comparison viewer: two large uncropped images. Below 700px:
  vertically stacked large images, each labeled, with selectors available in
  the same modal. Close stays visible while scrolling.
- Matrix scrolls only within its own region on narrow screens.
- Full prompts wrap; never truncated. Original images preserve aspect ratios.
- Modal focus containment, focus restoration, Escape close, visible focus,
  labeled controls, accessible range divider, reduced-motion support.
- Search-friendly server-rendered headings and per-route metadata. No invented
  publication date or canonical production URL.

## Validation results

- Scoped Next lint: passed with no warnings or errors in new feature code.
- Evidence integrity: **4 tests passed** (mapping, exact prompts, files and
  dimensions, unknown/unverified metadata).
- Browser integration: **22 checks passed**, no uncaught page errors.
- Viewports checked: 1440px desktop, 768px tablet, 390px and 320px mobile.
- No horizontal page overflow at any checked size.
- All twelve optimized outputs loaded. Clipboard copying preserves exact text
  (Windows normalizes clipboard newlines to CRLF).
- Live setup switching, dimension guard, keyboard divider, original-resolution
  viewer, matrix-to-original mapping, evidence PDF, empty filters, unknown-study
  404, focus containment/restoration, and reduced motion all passed.
- The PDF was inspected visually and as text; mapping matches the filenames.
- SHA-256 checks passed for all 14 copied assets.
- Local optimized build: **JavaScript/CSS compilation succeeded**, then the
  repository's type validation failed on existing unrelated errors. The build
  is therefore **not a complete pass**.
- Full TypeScript check reports 11 existing `string`-to-`never` icon-prop errors
  in admin, creator, notification, and editor files, none in this feature.
  The first build blocker is `src/app/admin/emails/page.tsx:50`.
- Build lint also reports an existing hook-dependency warning in
  `src/components/app/cards.tsx:491`. It was left unchanged.

Repeat commands, from the repository:

```text
node node_modules/next/dist/bin/next lint --dir src/components/case-studies --dir src/app/case-studies --dir src/data/case-studies --file src/lib/nav/destinations.ts
node node_modules/vitest/vitest.mjs run src/data/case-studies/case-studies.test.ts
node tests/case-studies.browser.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build
```

Browser screenshots/results are outside the repository at
`C:/Users/nicep/Desktop/maro-al/.case-studies-qa/`. The browser test accepts
`CHROME_PATH` for another local Chrome executable and `CASE_STUDIES_URL` for
another loopback port. It refuses a non-local test URL.

## Assumptions and deliberately unchanged areas

- The supplied filenames and the original PDF agree; no mapping was guessed.
- The experiment date and underlying Maro model are unknown and remain null.
- First-generation/no-selection and maroBrain context were supplied by the
  author; the UI distinguishes this from PDF-verifiable labels and prompts.
- All module filters are ready. Only NOMA Coffee is registered. Future cards
  contain no invented brands, results, or counts.
- Additional image studies require assets, one typed data object, and registry
  registration. Future video/audio/interactive web studies need corresponding
  media viewers when their evidence is available.
- Existing unrelated local changes, Hub composition, global typography, auth,
  generation engines, shared modal, billing, cookies, and editor/admin code
  were preserved. No dependencies were installed or changed by this task.
- Railway, production infrastructure, Supabase schemas, migrations, deployment
  configurations, and backend APIs were not modified.
- **Nothing was deployed, committed, or pushed.**
