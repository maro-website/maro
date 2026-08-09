# maro.al Design System

Version 1.0 · 9 August 2026 · Canonical specification

This document defines how maro looks, sounds, and behaves across product interfaces. It is written for designers, engineers, and AI coding tools. When examples differ from this document, this document and the token files win.

---

## 1. Brand character

maro is a clear, capable Albanian AI platform. The product should feel:

- **Direct:** the next action is obvious and language is concise.
- **Calm:** generous space, few competing accents, no ornamental clutter.
- **Capable:** advanced tools are presented as understandable controls.
- **Human:** plain Albanian language, warm feedback, recognizable user context.
- **Consistent:** every maro product feels like one connected platform.

### Visual formula

`soft gray workspace + white functional surfaces + near-black hierarchy + maro blue selection + rare red urgency`

### Design principles

1. **One clear action per region.** A header, panel, form, or dialog must have an obvious primary action.
2. **Space creates hierarchy.** Group with proximity and padding before adding borders or shadows.
3. **Color communicates state.** Blue is active/selected; red is destructive or urgent; gray is supporting.
4. **Controls explain themselves.** Pair unfamiliar icons with labels or tooltips.
5. **Advanced does not mean dense.** Reveal secondary settings progressively.
6. **The canvas stays quiet.** Generated work and user content should carry the visual energy.

### Avoid

Glassmorphism, neon glows, decorative gradients, floating blobs, excessive shadows, multiple icon styles, uppercase paragraphs, blue body copy, gray-on-gray essential text, tiny controls, and “card grids” used where simple grouping would work.

---

## 2. Logo system

### Approved assets

- `maro-logo.svg` — primary horizontal lockup; blue symbol with black wordmark.
- `maro-symbol.svg` — standalone symbol; use when the wordmark is already understood or space is constrained.
- `maro-symbol-white.svg` — derived inverse of the supplied symbol geometry; use only on Ink/Black.

The SVG artwork is authoritative. Do not redraw it with a font or approximate the symbol with CSS.

`assets/partners/nice-logo-white.svg` is a partner mark for the `Powered by NICE.al` context. It is not a maro logo or product icon. Preserve its supplied gradient and white wordmark and use it only on a sufficiently dark surface.

### Preferred use

| Context | Asset | Treatment |
|---|---|---|
| Desktop application header | Full logo | Original blue + black on white/light background |
| Marketing or authentication header | Full logo | Original lockup with generous clear space |
| Mobile application header | Symbol | Original blue, with accessible product name nearby if context is unclear |
| Assistant/avatar tile | Symbol | `maro-symbol-white.svg` on `#111111`, or original blue symbol on white |
| Favicon/app icon | Symbol | Centered, never cropped |

### Clear space

Let **x** equal the diameter of the circular element in the symbol. Keep at least `0.5x` clear space around every side of the symbol or lockup. No text, edge, icon, or border may enter this area.

### Minimum size

- Full logo: `120px` wide on screens; `32mm` in print.
- Symbol: `24px` visible size for UI identity; `32px` preferred; `16px` only for favicons.

### Backgrounds

The primary lockup belongs on white or `#F5F5F5`. The white symbol may sit on Ink or Black. Do not apply CSS filters to manufacture other variants. A full inverse maro lockup is not currently approved.

### Never

- stretch, skew, rotate, crop, outline, recolor, or rearrange the artwork;
- separate the wordmark letters;
- place the full black wordmark on a dark background;
- add drop shadows, glow, gradients, or containers that touch the clear space;
- use the symbol as a decorative pattern behind readable content.

---

## 3. Color

### Primitive palette

Only these supplied values are brand primitives. Opacity and semantic combinations are allowed; new brand hex values require approval.

| Name | Value | Role |
|---|---:|---|
| White | `#FFFFFF` | surfaces, inverse text |
| Ink | `#111111` | primary text, inverse surfaces, primary controls |
| Gray 300 | `#C7C7C7` | disabled/placeholder content, borders |
| Gray 600 | `#818181` | secondary metadata and icons |
| Gray 050 | `#F5F5F5` | application canvas, quiet fill |
| maro Blue | `#253FDA` | brand, selected state, links, key focus/action |
| Black | `#000000` | exceptional maximum contrast; not the default text color |
| Danger Red | `#DA2525` | destructive actions, errors, urgent state |
| White 38 | `rgba(255,255,255,.38)` | controlled overlay/gradient stop |

### Semantic mapping

Never select colors by appearance. Select them by meaning.

| Meaning | Token | Value |
|---|---|---|
| App canvas | `--maro-color-bg-canvas` | Gray 050 |
| Raised/default surface | `--maro-color-bg-surface` | White |
| Inverse surface | `--maro-color-bg-inverse` | Ink |
| Active/selected surface | `--maro-color-bg-selected` | maro Blue |
| Primary text | `--maro-color-text-primary` | Ink |
| Supporting text | `--maro-color-text-secondary` | Gray 600 |
| Placeholder/disabled | `--maro-color-text-tertiary` | Gray 300 |
| Brand/link text | `--maro-color-text-brand` | maro Blue |
| Destructive/error | `--maro-color-text-danger` | Danger Red |

### Blue and red discipline

Blue means the user has selected something, can navigate somewhere, or is taking the platform’s key action. Do not make every button blue. Near-black is the standard high-emphasis control; blue distinguishes platform selection and the most important contextual action.

Red is not a general accent. Use it for destructive actions, validation failure, account risk, or an explicitly branded exceptional mode such as `maroFort`. Destructive actions require a clear label and confirmation when the effect is difficult to reverse.

### Gradient

The approved exceptional gradient is:

```css
linear-gradient(90deg, #DA2525 0%, #E65B5B 48%, rgba(255,255,255,.38) 100%)
```

Use it only for a named exceptional capability or promotional badge. Never use it as a page background, standard button fill, or decorative text fill.

### Contrast

- Essential body text and control labels should meet WCAG AA: 4.5:1 for normal text.
- `#818181` is supporting text, not the preferred color for long small copy.
- `#C7C7C7` is never the sole color for essential information.
- White text is approved on Ink, maro Blue, and Danger Red.
- Focus is communicated with a visible blue ring plus shape/position, not color alone.

---

## 4. Typography

### Typeface

Use **Manrope** everywhere: navigation, forms, buttons, menus, tables, dialogs, generated product UI, and marketing surfaces. Load weights 400, 500, 600, and 700.

```css
font-family: "Manrope", "Segoe UI", Arial, sans-serif;
```

### Kerning/tracking conversion

The supplied Figma tracking value `-30` is implemented on the web as:

```css
letter-spacing: -0.03em;
```

Never use `letter-spacing: -30px`. That would make text overlap. Use `-0.03em` for headings, labels, buttons, menus, and short UI text. Use `-0.01em` for paragraphs, instructions, and text-entry areas to protect reading comfort. Code, keys, IDs, and tabular figures use normal tracking.

### Product type scale

| Style | Size / line height | Weight | Tracking | Use |
|---|---|---:|---:|---|
| Display | 56 / 59 | 600 | -3% | Rare hero or empty-state message |
| H1 | 40 / 46 | 600 | -3% | Product/page title |
| H2 | 32 / 38 | 600 | -3% | Major section |
| H3 | 24 / 30 | 600 | -3% | Panel/dialog title |
| H4 | 20 / 26 | 600 | -3% | Component section title |
| Body large | 18 / 28 | 400 | -1% | Lead or user prompt |
| Body | 16 / 24 | 400 | -1% | Default reading text |
| Label | 14 / 18 | 600 | -3% | Controls and navigation |
| Meta | 12 / 16 | 500 | -1% | Timestamp, credit count, helper text |
| Micro | 11 / 14 | 500 | 0 | Legal/footer/compact status |

### Type rules

- Sentence case is standard. Do not use title case for every label.
- Left-align product copy. Center only compact empty states, confirmations, or promotional moments.
- Keep body lines near `55–75ch`.
- Prefer two weights in one view; three is the practical maximum.
- Use weight and spacing before introducing another color.
- Numeric balances and timestamps should use `font-variant-numeric: tabular-nums`.

---

## 5. Spacing, grids, and shape

### Four-point system

All spacing resolves to multiples of 4px.

| Token | Pixels | Typical use |
|---|---:|---|
| 1 | 4 | micro gap |
| 2 | 8 | icon-to-label, tight stack |
| 3 | 12 | chip padding, compact control gap |
| 4 | 16 | default component padding |
| 5 | 20 | comfortable control/panel gap |
| 6 | 24 | card padding, form sections |
| 8 | 32 | region spacing |
| 10 | 40 | shell gutter |
| 12 | 48 | section separation |
| 16 | 64 | page rhythm |
| 20 | 80 | major desktop separation |
| 24 | 96 | rare large-section spacing |

Do not introduce arbitrary values such as 13px, 18px, or 27px for layout spacing. Optical SVG alignment may use a 1–2px adjustment when documented locally.

### Radius

| Radius | Use |
|---:|---|
| 8px | small controls, icon buttons |
| 12px | standard buttons, chips, fields |
| 16px | cards, menus, composer, sidebar items |
| 20px | large panels and sheets |
| 999px | status pills and avatars only |

Nested items should have a visibly smaller radius than their parent. Avoid mixing more than three radii in one view.

### Borders and elevation

Use a subtle `rgba(17,17,17,.08)` separator when proximity is insufficient. Standard cards are flat. Shadows belong only to content that floats above the page: menus, popovers, dialogs, sheets, drag previews. Never stack a heavy border and a heavy shadow.

### Responsive grid

| Viewport | Columns | Outer gutter | Behavior |
|---|---:|---:|---|
| `<480px` | 4 | 16px | phone, single-column |
| `480–767px` | 4 | 20px | large phone |
| `768–1023px` | 8 | 24px | tablet |
| `1024–1279px` | 12 | 32px | compact desktop |
| `1280–1599px` | 12 | 40px | standard desktop |
| `≥1600px` | 12 | 48px | wide desktop; cap content widths |

Content should not grow indefinitely. Reading content caps at `75ch`; the central creation workspace caps at `1120px`; utility sidebars cap near `280px`.

---

## 6. Product shell

The Figma reference defines a workspace with four stable regions: top bar, left product rail, central work area, and quiet footer. The profile panel is an overlay anchored to the top bar, not a permanent fourth column.

### Desktop anatomy

```text
┌──────────────────────────────────────────────────────────────┐
│ logo · global utilities                 credits · wallet · me │ 80
├──────────────┬───────────────────────────────────────────────┤
│ product rail │ central workspace                             │
│ 280px        │ max 1120px, centered within remaining space   │
│              │                                               │
├──────────────┴───────────────────────────────────────────────┤
│ copyright                              legal/help links        │ 56
└──────────────────────────────────────────────────────────────┘
```

- Canvas: soft gray.
- Header and footer: white or canvas-colored with whitespace separation; use a divider only when scrolling content needs it.
- Header: 80px desktop, 64px small screen.
- Desktop shell gutter: 32–48px based on viewport.
- Product rail: 280px preferred. It may be 240px at compact desktop.
- Central workspace: maximum 1120px; user-generated outputs may be narrower based on aspect ratio.

### Product navigation card

Each item has an icon at top-left and a label aligned near the bottom-left. Standard geometry: `min-height: 128px`, `padding: 20px`, `radius: 16px`.

- Active: Ink background, white content.
- Available: white background, Ink content.
- Coming soon: white background, tertiary content, no hover affordance, optional `së shpejti` status.
- Focus: blue focus ring outside the card.
- Do not use blue for the active rail item; Ink creates the strong anchor shown in the reference.

### Utility navigation

Small utility rows such as ideas and saved work are 56–64px high, white, and label-first. Use 20px icons aligned to the trailing edge where the action is obvious.

### Account menu

Desktop width: 260–300px; `padding: 16px`; `radius: 16px`; overlay shadow. Begin with avatar/name/email, separate account/admin links, then saved/creator links, then a full-width danger sign-out action.

On phone, use a bottom sheet with a drag handle and 16px edge clearance. Closing behaviors: close button, Escape, or backdrop click when safe.

### Footer

Use 11–12px supporting text. Keep legal links in a wrapping row with at least 16px gaps. On mobile, stack copyright above links; do not compress the labels until they become unreadable.

---

## 7. Core components

Every interactive component requires default, hover, pressed, focus-visible, disabled, and loading states when asynchronous. Error and selected states apply where relevant.

### Button

| Variant | Background | Content | Use |
|---|---|---|---|
| Inverse primary | Ink | White | Default high-emphasis action |
| Brand | maro Blue | White | Context’s single platform-defining action or selection |
| Secondary | White | Ink | Supporting action on canvas |
| Ghost | Transparent | Ink | Low-emphasis action |
| Danger | Danger Red | White | Destructive action |

Sizes: 32px compact, 40px default, 48px large. Use 12px radius, 12–20px horizontal padding, 14px/600 label. Icon gap is 8px. A loading button retains its width and announces progress. Do not use icon-only buttons for unfamiliar actions.

### Icon button

Visible sizes: 32px compact or 40px default. Touch target: at least 44px. Icon: 18–20px. Always provide an accessible name and tooltip for ambiguous actions. Use square 8–12px radius; reserve circular shapes for avatars or highly conventional floating controls.

### Chip / configuration pill

Used for model, aspect ratio, mode, credit balance, and status. Height 32–40px, radius 12px, 12px horizontal padding, 8px gap. Use white on canvas for read-only context and Ink for configurable controls in the composer. A selected platform chip may use maro Blue. Keep label + value together; truncate only the value.

### Field

- Height: 48px for single-line fields.
- Fill: white on canvas; Gray 050 inside white panels.
- Border: subtle by default, blue on focus, red on error.
- Radius: 12px.
- Label: 14px semibold above field, never placeholder-only.
- Helper/error: 12px beneath field, connected via `aria-describedby`.
- Disabled: muted fill and text, `not-allowed` cursor only on pointer devices.

### Text area / creation composer

The composer is a primary product object, not a generic textarea.

Anatomy:

1. large writing region with prompt text;
2. optional expand control aligned top-right;
3. bottom toolbar with attachment and configuration controls;
4. credit estimate near submission;
5. submit action aligned last.

Desktop: `min-height: 176px`, `padding: 24px`, white, radius 16px. Bottom toolbar wraps safely at narrower widths. On mobile, configuration controls become a horizontal scroller or a secondary sheet; the submit action remains visible. Prompt text uses 16/24 with `-0.01em` tracking.

### Menu and popover

Use for brief contextual choices. Width follows content with 220px minimum and 320px practical maximum. Padding 8px, item height 44px, item radius 8px, icon 20px. Groups use subtle separators. Arrow-key navigation, Escape, and focus return are required.

### Dialog

Use for decisions that interrupt the current flow. Width 480px standard, 640px for complex content, max `calc(100vw - 32px)`. Radius 20px; padding 24px. Title, explanation, content, and actions form clear vertical groups. On phone, use a bottom sheet when the task benefits from more vertical space.

### Card / surface

A card is a meaningful grouped object, not a default wrapper. White fill, 16px radius, 20–24px padding, no shadow. Clickable cards gain a subtle canvas tint on hover and blue focus ring. Do not nest card inside card unless the inner object has an independent action or status.

### Avatar

Sizes: 24, 32, 40, 48px. Radius: 10–12px in the product reference, not necessarily a circle. Use a person’s image when available. Fallback uses initials on Ink or maro Blue with white text. Decorative avatars have empty alt text; identity avatars have accessible names in surrounding content.

### Status / feedback

- Success: use Ink or blue plus a check icon and explicit text. Do not invent a green brand color without approval.
- Information: maro Blue plus text.
- Warning: use Ink with a warning icon and direct copy; do not invent orange.
- Error: Danger Red plus error icon and recovery instruction.
- Loading: retain layout; use subtle spinner or skeleton. Skeletons use Gray 300 at reduced opacity.

### Tabs

Use tabs only for peer views of the same object. Active tab uses Ink text and a 2px blue indicator. Inactive tabs use secondary text. Minimum 44px interaction height. On small screens tabs scroll horizontally without clipping.

### Table / data list

Use tables for comparable data, lists for actions or content. Header: 12px/600 secondary text. Row: minimum 52px. Align numbers right with tabular figures. On small screens, hide genuinely secondary columns or switch to labeled rows; never make the whole page horizontally scroll by accident.

### Tooltip

For short clarification only; never hide essential instructions. Ink surface, white 12px text, 8px radius, 8×12px padding. Appears after a short delay and is available on keyboard focus.

### Empty state

Use the maro symbol at low emphasis only when it aids recognition. Include a direct title, one sentence of guidance, and at most one primary plus one secondary action. Do not use playful decoration to fill space.

---

## 8. AI creation patterns

### Prompt message

User prompts sit on a white surface with 16px radius and 24px padding. Keep readable width even in a wide workspace. Context chips appear immediately above in a wrap-safe row. Timestamp is supporting metadata, not aligned so far away that it loses association.

### Generation state

Show assistant identity, a precise status (`Duke përgatitur imazhin…`), and progress only when meaningful. Preserve the future result’s dimensions to prevent layout shift. Cancellation is available for long operations.

### Generated asset

Respect the asset’s aspect ratio and do not stretch it. A loading placeholder uses the requested ratio. Actions such as download, edit, save, and regenerate appear on hover/focus for pointer users and remain reachable on touch.

### Credits

Display credit balance as a compact status pill. Show estimated cost next to the final create action before submission. If credits are insufficient, explain the amount needed and provide one direct route to add credits; do not wait until after submission.

### Configuration order

Keep controls predictable: `product/tool → model → format/ratio → content mode → quality/speed → estimated credits → submit`.

---

## 9. Iconography and imagery

### Icons

Use the canonical solid icon family in `icons/`. Every icon uses a 24×24 viewBox, filled geometry, `currentColor`, and a kebab-case filename. Standard product size is 20px; use 16px for dense metadata, 24px for major navigation, and 32px only for an empty state or feature identity. Do not alter the icon’s internal paths to create local weight variants.

Use inline SVG or a CSS mask when the icon must inherit semantic state color. External SVGs rendered through `<img>` do not inherit the parent text color and therefore default to Ink. Never use CSS filters to recolor icons.

Do not mix outline, duotone, emoji, or third-party icons with the solid maro family. Before drawing a new icon, search `icons/manifest.json` by name, category, and aliases. When a missing icon becomes necessary, add one canonical 24×24 solid asset to the library rather than drawing it inside a component.

#### Icon categories

- **Product:** maro tools and third-party model identities.
- **Navigation:** direction, menus, view switching, and external destinations.
- **Action:** create, edit, save, attach, download, transform, and organize.
- **Feedback:** loading, notification, success, error, warning, and help.
- **Account:** user, administration, security, billing, and settings.
- **Media:** image, video, audio, and playback controls.
- **Visibility:** show and hide.

`icons/manifest.json` is the machine-readable source of names and aliases. `icons/index.html` is the visual source for selection and review.

### Product imagery

Generated content is shown without decorative filters. Use neutral backgrounds around mixed aspect ratios. Crop only when the container clearly signals a thumbnail; open the full asset without crop. Provide descriptive alternative text for meaningful images.

### User photography

Keep natural color. Crop avatars around the face and shoulders. Do not apply a platform-wide duotone or blue overlay.

---

## 10. Motion

Motion explains relationship, order, or completion.

- Hover/focus transitions: 100–160ms.
- Control state changes: 160–240ms.
- Menu/sheet/dialog entrance: 240–360ms.
- Standard easing: `cubic-bezier(.2, 0, 0, 1)`.
- Exit may be slightly faster than entrance.

Prefer opacity plus a small 4–8px translation. Do not animate large background objects, add endless idle movement, or delay common actions. Respect `prefers-reduced-motion` and provide the same information without motion.

---

## 11. Responsive behavior

### Desktop ≥1024px

Show the left rail. Center the workspace inside remaining width. Keep account UI anchored to the header. Composer toolbar may be one row when space allows.

### Tablet 768–1023px

Replace the left rail with a menu button and drawer. Keep logo/symbol, credits, and profile accessible in the top bar. Central content fills available width with 24px gutter. Two-column content may collapse based on minimum usable width, not device name.

### Mobile <768px

- Header height: 64px; symbol preferred.
- Outer gutter: 16px.
- Stack prompt metadata and timestamps.
- Composer attaches near the flow, not permanently over content unless the screen is dedicated chat.
- Tool controls scroll horizontally or open a sheet.
- Menus become sheets when they exceed safe width.
- Footer stacks.
- No fixed-width cards, clipped text, hover-only actions, or horizontal page overflow.

### Safe-area support

Fixed mobile UI must include `env(safe-area-inset-*)`. Bottom sheets and composer controls need bottom padding equal to safe area plus their normal spacing.

---

## 12. Accessibility

Target WCAG 2.2 AA.

- Use landmarks: header, nav, main, aside, footer.
- Maintain logical heading levels and DOM order.
- All actions work with keyboard; never attach click behavior to a non-interactive element without proper semantics.
- Focus is always visible and never covered by sticky UI.
- Icon-only buttons have accessible names.
- Status changes and generation completion use appropriate live regions without excessive announcements.
- Form errors identify the problem and how to fix it.
- Do not rely on color alone for state.
- Touch targets are at least 44×44px.
- Zoom to 200% must not hide actions or force two-dimensional scrolling.
- Honor reduced motion, forced colors, and sufficient contrast.
- Albanian text uses correct diacritics such as `ë` and `ç`; do not strip them.

---

## 13. Language and voice

maro speaks like a capable guide: concise, specific, and calm.

### Interface writing

- Use sentence case.
- Start buttons with a clear verb: `Krijo`, `Ruaj`, `Shkarko`, `Provo përsëri`.
- Avoid vague actions such as `OK`, `Po`, or `Vazhdo` when a specific outcome can be named.
- Errors explain the issue and recovery: `Imazhi nuk u krijua. Provo përsëri ose ndrysho modelin.`
- Confirmations state what happened: `Imazhi u ruajt.`
- Keep helper copy to one useful sentence.
- Credit language should be transparent before an action costs credits.

### Product names

Keep the brand lowercase in running text: `maro`, `maro.al`, `maro Imazh`, `maro Brand`, `maro Web`. Preserve officially approved casing for named products. Do not write `MARO` unless the legal context explicitly requires it.

### Localization

Design Albanian first while allowing strings to grow by roughly 30% for translation. Never bake labels into images. Dates, numbers, currency, and pluralization use locale-aware APIs.

---

## 14. Implementation contract

### Source order

1. Load Manrope.
2. Import `tokens/maro.css` once at the application root.
3. Apply global reset/base styles.
4. Implement primitives (Button, IconButton, Field, Surface, Text).
5. Compose product components from primitives.
6. Compose pages from product components.

### Token rules

- Components consume semantic aliases such as `--maro-color-text-primary`, not primitive hex values.
- Raw brand primitives may only appear in the token layer and official SVGs.
- Component variants are semantic (`danger`, `selected`, `inverse`), never arbitrary (`red`, `blue`).
- All z-index values should come from one documented local scale: base 0, sticky 10, dropdown 20, overlay 30, dialog 40, toast 50.

### Component API example

```tsx
<Button variant="brand" size="md" loading={isCreating}>
  Krijo imazhin
</Button>
```

Good APIs expose purpose, size, state, and behavior. They do not expose `background="#253FDA"`, uncontrolled radii, or per-instance shadow props.

### CSS example

```css
.maro-button {
  min-height: var(--maro-control-height-md);
  padding-inline: var(--maro-space-4);
  border: 0;
  border-radius: var(--maro-radius-12);
  font-size: var(--maro-font-size-14);
  font-weight: var(--maro-font-weight-semibold);
  letter-spacing: var(--maro-tracking-brand);
  transition:
    background-color var(--maro-duration-fast) var(--maro-ease-standard),
    transform var(--maro-duration-instant) var(--maro-ease-standard);
}

.maro-button[data-variant="brand"] {
  color: var(--maro-color-text-inverse);
  background: var(--maro-color-bg-selected);
}

.maro-button:active:not(:disabled) {
  transform: translateY(1px);
}
```

### Definition of done for every new screen

- Uses Manrope and the correct tracking conversion.
- Uses semantic tokens with no new unapproved colors.
- Matches the spacing, radius, and component contracts.
- Has responsive layouts at 375, 768, 1024, 1440, and 1920px.
- Has keyboard navigation and visible focus.
- Covers empty, loading, success, error, disabled, and overflow states as relevant.
- Has no clipped Albanian text or horizontal page overflow.
- Passes contrast and accessible-name checks.
- Respects reduced motion.
- Reuses official logo assets.

---

## 15. AI / Cursor build prompt

Use this when starting a new maro interface. The `.cursor` rule applies the same contract automatically.

```text
Build this interface as part of maro.al. Before coding, read MARO-DESIGN-SYSTEM.md and tokens/maro.css and treat them as the source of truth.

Use Manrope for all UI. Interpret Figma tracking -30 as CSS letter-spacing: -0.03em, not -30px. Use semantic --maro-* tokens; do not introduce raw colors, fonts, shadows, gradients, spacing, radii, or component styles outside the system.

Keep the UI calm and functional: soft-gray canvas, flat white surfaces, near-black hierarchy, maro blue for selection/platform action, and red only for destructive/error/approved exceptional states. Reuse official maro-logo.svg and maro-symbol.svg.

Compose the screen from documented maro components and implement every relevant state. Make it responsive at 375, 768, 1024, 1440, and 1920px. Below 1024px the product rail becomes a drawer. Keep touch targets at least 44px, add semantic HTML and keyboard behavior, visible focus, accessible names, status announcements, proper errors, and reduced-motion support.

Before finishing, check visual hierarchy, token use, wrapping, long Albanian labels, empty/loading/error states, keyboard flow, contrast, and horizontal overflow. Explain any intentional exception.
```

---

## 16. Governance

### Source of truth

1. `MARO-DESIGN-SYSTEM.md` defines intent and behavior.
2. `tokens/maro.css` defines production web values.
3. `tokens/maro.tokens.json` transports values to other platforms.
4. Official SVGs define the logo artwork.
5. The visual guide demonstrates the system but does not override it.

### Adding a component

Add a component only when the pattern repeats or needs consistent accessibility behavior. Define its purpose, anatomy, variants, sizes, states, responsive behavior, keyboard interaction, content guidance, and tokens. Validate it in realistic product context before declaring it stable.

### Changing a token

Change primitive values only with brand approval. Update CSS and JSON together, inspect every semantic consumer, test contrast, and record the decision. Do not patch individual components to imitate a token change.

### Versioning

- Patch: clarification or nonvisual fix.
- Minor: backward-compatible component or token addition.
- Major: renamed/removed tokens, changed component anatomy, or changed brand foundations.

The system should evolve deliberately, not by accumulating local exceptions.
