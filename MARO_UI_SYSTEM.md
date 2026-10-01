# MARO UI system

Refined 1 October 2026. Dark mode is the primary product experience; Qelt is equally supported. Maro remains Manrope, lime `#00ff72`, the existing symbol, expressive creative artwork, conversational Albanian copy, and its wide promptbox. The protected lime is unchanged.

## Authority and theme architecture

`maro-final-design-system/tokens/maro-final.css` is the runtime authority. Shared CSS primitives and layouts are imported once by `src/app/globals.css`. `src/styles/maro-compat.css` maps established aliases to that authority; it is not a second palette. `tailwind.config.ts` maps CSS variables and supports opacity modifiers with `color-mix`. The JSON token mirror is generated, not hand maintained:

```sh
node tools/ui-refinement/tokens.mjs --write
node tools/ui-refinement/tokens.mjs --check
node tools/ui-refinement/contrast.mjs
pnpm audit:ui
```

Keep the existing ThemeProvider, `data-theme="mshelt"` / `data-theme="qelt"`, per-account local storage and pre-hydration theme bootstrap. Default SSR is Mshelt. Never add a competing Tailwind `dark:` system or change the bootstrap without also validating its CSP hashes and account-switch behavior.

## Colors

Use semantic roles. Dark canvas/surface/raised tones form quiet layers; everyday cards stay flat. Floating menus and dialogs use a subtle border plus elevation. In Qelt, the off-white canvas and white panels preserve hierarchy.

| Role (`--maro-color-` prefix) | Mshelt | Qelt |
| --- | --- | --- |
| `bg-canvas` | `#111315` | `#f9f9f9` |
| `bg-surface` | `#1b1e21` | `#ffffff` |
| `bg-surface-02` | `#25292e` | `#f3f3f3` |
| `bg-surface-raised` | `#25292e` | `#ffffff` |
| `bg-surface-hover` | `#30363c` | `#ededed` |
| `bg-surface-active` | `#343c44` | `#e3e7e5` |
| `bg-subtle` | `#171a1d` | `#f3f3f3` |
| `text-primary` | `#f2f4f6` | `#0a0a0a` |
| `text-secondary` | `#bcc3cb` | `#5f5f5f` |
| `text-tertiary` | `#9aa4af` | `#646b73` |
| `text-muted` | `#9aa4af` | `#646b73` |
| `text-disabled` | `#78838f` | `#747b83` |
| `text-inverse` | `#111315` | `#ffffff` |
| `border-subtle` | `#343b43` | `#e3e3e3` |
| `border-default` | `#4b5561` | `#c9c9c9` |
| `border-interactive` | `#67727e` | `#858c95` |
| `border-focus` | `#00ff72` | `#007a38` |
| `accent` | `#00ff72` | `#00ff72` |
| `accent-hover` | `#00d961` | `#00d961` |
| `accent-active` | `#00bf56` | `#00bf56` |
| `accent-subtle` | `#173526` | `#e1f8eb` |
| `text-brand` | `#00ff72` | `#007a38` |
| `text-on-accent` | `#0a0a0a` | `#0a0a0a` |
| `success` | `#65dfa1` | `#11713f` |
| `warning` | `#ffcc75` | `#935900` |
| `danger` | `#ff8585` | `#c62828` |
| `info` | `#a2c9ff` | `#275c9b` |

Lime fills require `text-on-accent` (black) in **both** modes. Light functional green text uses `text-brand` rather than raw lime. Inverse surfaces use `text-inverse`. Destructive fills use `bg-danger` plus `text-on-danger`, rather than the lighter dark-mode danger text token. Photography scrims keep white `text-on-scrim` in both themes. The fort gradient retains its red identity; ordinary red is reserved for errors/destructive actions. Status colors are feedback, never a competing primary brand.

`bg-selected` preserves the existing lime selection fill; `bg-surface-selected` and `accent-subtle` support quieter selection. Use an icon/check, underline or `aria-selected` / `aria-pressed` alongside color. Disabled text/surface are distinct tokens. Disabled controls may have reduced contrast but must retain legible labels; never mute actionable information into a disabled treatment.

## Typography

Manrope remains the interface family. User-selected logo fonts, generated website typography and artwork are content, and keep their independent styles.

| Style | Size | Weight / line height | Use |
| --- | --- | --- | --- |
| `.maro-text-display` | responsive, up to 40px | 700 / 1.2 | Hub greeting or brief intro only |
| `.maro-text-h1`, `.maro-page-title` | 28–32px | 700 / 1.2 | Product page title |
| `.maro-text-h2` | 24px | 700 / 1.2 | Major section |
| `.maro-text-h3` | 20px | 600 / 1.2 | Panel/modal title |
| `.maro-text-h4` | 18px | 600 / 1.2 | Card/empty title |
| `.maro-text-body-lg` | 16px | 400 / 1.5 | Intro, long reading and inputs |
| `.maro-text-body` | 14px | 400 / 1.5 | Default product copy |
| `.maro-text-label` | 14px | 600 / 1.2 | Labels and actions |
| `.maro-text-caption` | 12px | 500 / 1.5 | Metadata and helpers |

Heading tracking is -0.03em; body tracking is -0.01em. 11px is retained only for compact secondary badges/metadata. Never use micro text for form instructions. Use 16px editable fields to avoid mobile zoom. Prefer normal wrapping; truncate only bounded navigation/file/name rows, retaining the full accessible label. One functional screen does not need several display-sized headings.

## Spacing and layouts

The canonical scale is 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px (`--maro-space-*`). Use 8px between icon and label; 8px label-to-control; 12–16px grouped controls; 24px panel/modal padding; 24–32px major sections. Existing `--maro-gap-10/20/30` aliases preserve established layouts and the 30px desktop navigation rhythm. They are compatibility values, not a reason to invent more arbitrary sizes.

- `.maro-page-shell`: existing 1200px product container and responsive gutters.
- Add `.maro-content-shell` for reading/settings content capped at 896px.
- `.maro-workspace-shell`: full width, capped at 1600px; tools may use the existing 1120px module or 1312px promptbox width.
- Sidebar: existing 280px shell; inspector guideline: 320px. Use `min-width:0` on flexible columns.
- `.maro-page-header`, `.maro-panel`, `.maro-section`, `.maro-form-grid`, `.maro-list`, `.maro-action-row` provide established structure. Do not wrap every text group in a new panel.
- The hub greeting uses 40–64px vertical padding rather than a second full-height stage. Creative launch-card artwork is preserved.

## Shape, borders and elevation

Radii: 4px for tiny marks; 8px for compact details; 12px for inputs/default buttons; 16px for menus/interactive cards; 20px for panels/dialogs; 24px for larger wizard surfaces; full for avatars and switch tracks. 32px remains available to existing showcase content. Do not put pill radii on every form field.

Use surface tones before borders. Subtle borders separate structure and floating layers; interactive borders visibly identify editable controls; focus is its own 2px outline with 3px offset. Do not globally make `border-line` transparent, or override backgrounds of every native input: transparent prompt editors and nested controls need their own surface context.

Elevation 0 is flat. `shadow-float` / `--maro-shadow-float` is for dropdowns, toasts and floating controls. `shadow-overlay` is for dialogs. Both resolve per theme. No generic `shadow-lg` on product cards. Literal artwork (such as a paper logo mockup) can contain photographic shadows; this does not define Maro chrome.

## Buttons and icons

Use `src/components/ui/Button.tsx`. Existing API names remain stable:

| Variant | Behavior |
| --- | --- |
| `primary` | Existing high-contrast inverse surface |
| `brand` | Protected lime CTA, black foreground |
| `secondary` / `outline` | Secondary surface |
| `ghost` / `subtle` | Tertiary action; surface on hover/press |
| `danger` | Dark red fill, white foreground |
| `size="icon"` | Visible icon children, 44px target; provide `aria-label` |

Sizes are compact 36px, default 44px and large 52px. A compact button belongs only in dense desktop groups; keep primary/mobile/icon targets at least 44px. Labels are 14px semibold, normal icon size 20px, gap 8px. Hover and pressed colors are semantic. `loading` disables the control, sets `aria-busy`, and shows the shared CSS spinner without changing the business handler. Keep meaningful loading labels.

Use existing Maro icons first; Lucide utility icons remain the established fallback. Standard sizes are 16/20/24px. Preserve intentionally branded module marks; avoid introducing another icon family or emojis as new functional controls.

## Forms

Use `Input`, `Textarea`, `Select`, `Field` from the shared UI directory. `.maro-input` supports legacy wrappers such as maroBrain without changing their save logic. Field height is 52px; textarea starts at 128px and resizes vertically. Use semantic surface, border-interactive, readable placeholder, green focus, disabled state and red validation border. `Field` associates the label by id and describes hints/errors with `aria-describedby`; native/shared fields receive `aria-invalid`.

SearchableSelect keeps its listbox, search field, 44px options and keyboard movement. Errors are announced and described. Switch and checkbox checked states use lime plus a dark mark. An upload region is a keyboard-operable button; label the actual file/color input. Preserve file types, limits and validation business rules. Inputs in a transparent composer retain that layout; do not blindly wrap them in field styling.

## Cards, navigation and feedback

Standard cards use surface, restrained radius and spacing. Interactive cards add visible hover/focus; selected cards add accent-subtle and a check/ring. Tool panels may be denser than overview cards. Stats use typography and grouping, rather than decorative elevation.

Desktop active navigation has an accent tint and underline. Mobile navigation is a full-height drawer with independent scroll, focus trap, Escape close and restoration to its trigger. Wide desktop navigation can scroll horizontally within its own bar. Workspace names truncate within their button; dropdowns stay bounded by viewport gutters.

Shared menus use raised surfaces, 16px padding and 44px rows. `useMenuKeyboard` provides first focus, ArrowUp/Down, Home/End, Escape and trigger restoration. Search editing keeps normal Home/End behavior. `useDialogFocus` handles Tab wrap, Escape, nested scroll locks and restoration for Modal, PromptExpand and NavDrawer. Menu Escape is consumed before a containing dialog closes. Reuse these hooks when upgrading a UI-only wrapper.

`EmptyState`, `Skeleton`, `Spinner`, `Toast` and `.maro-alert` provide consistent no-result/loading/error/success presentation. Skeletons are hidden from assistive technology; spinners have a status label; error alerts announce errors; toasts wrap long text and expose a named close button. Do not create a new ad hoc alert palette.

## Motion and layering

Fast 160ms, normal 200ms, slow 300ms; standard easing `cubic-bezier(0.2,0,0,1)`. Use slow motion only when spatial movement needs it. Global reduced-motion rules suppress nonessential animation and scrolling effects. Retain deliberate creative previews as content.

Z-index: base 0, sticky 30, overlay 100, dialog 120, dropdown 130, tooltip 140, toast 200. A dropdown inside the drawer/dialog must render above its surface. Avoid arbitrary 9999 values. Portal menus reposition on scroll/resize where necessary and use a viewport height bound.

## Responsiveness and accessibility

Use existing Tailwind breakpoints: mobile below 640; tablet 640–1023; desktop navigation from 1024; wide desktop 1280+. Test 1920, 1440, 1280, 768, 390 and 320px. Stack form grids and account panels; replace global nav with the drawer; keep tool options scrollable/wrapping within their panel. The mobile promptbox uses its existing expandable dock and safe-area bottom spacing.

Check both themes for normal, hover, active, selected, expanded, loading, disabled, empty and error states. Functional text aims for 4.5:1 contrast; focus and control boundaries aim for 3:1. Structural separators need not meet an interactive-boundary contrast threshold. The contrast tool checks resolved token combinations, not every pixel of artwork or every possible user-supplied color; browser review is still required.

Do: reuse roles, hierarchy, surfaces and shared controls; retain Albanian product voice; use semantic HTML, real buttons and visible keyboard focus. Don't: replace the protected lime, hardcode new chrome palettes, globally remove outlines/borders/shadows, add a second theme engine, oversize every page title, or rewrite auth/generation/billing to improve presentation.
