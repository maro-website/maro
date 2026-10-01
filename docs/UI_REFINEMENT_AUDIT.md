# UI refinement audit — 1 October 2026

## Entry and scope

Production source was identified by the successful Railway web deployment, not the older dirty checkout. Source SHA: `fdb52d737ba7a2ab91a46fc61d7cb2509601bba2`. Exact source plus existing untracked evidence was preserved at `pre-ui-system-refinement-2026-10-01` / `0dc627753c0062caa16f79192826c8028511c2ed` before edits. Baseline production build passed with production flags. No staged/source edits existed in that checkout. See `UI_REFINEMENT_RESTORE.md`.

Repository inspection covered route/component inventory, both theme token sets, compatibility/Tailwind mappings, font/size/radius/spacing declarations, native and shared control styles, hardcoded chrome colors, focus removal, shadow/blur conflicts and responsive rules. This is a UI pass; API routes, schema/migrations, providers, prompt compilation, auth/credit/billing rules and routing are unchanged.

## Inventory and resulting treatment

| Area | Patterns inspected | Refinement / preservation |
| --- | --- | --- |
| Global shell | AppShell, AppTopNav, HubDropdown, NavDrawer, account menu | Active nav tint/underline, raised menus, bounded placement, long-name truncation, keyboard movement, mobile focus trap/restoration |
| Hub / dashboard | HubVision, launch/future cards, workspace picker, project/generation cards | Shorter greeting stage; accessible functional green and semantic empty/loading surfaces; 44px card actions; creative artwork/media preserved |
| AI tool interfaces | ImazhWorkspace, ModuleHero, ToolComposer, PromptExpand, WebWorkspace | Practical 28–32px title hierarchy, shared generation button, inherited icon foregrounds, bounded option menus, 44px expanded mobile dock, expanded prompt dialog focus |
| maroFort | Existing speed/size/advanced attributes and red gradient | Darker red gradient keeps white readable; semantic dock foregrounds; configuration, limits and behavior retained |
| maroBrain | Sidebar tabs, workspace select, information/target/source forms, clear/save | Shared field presentation, implicit native labels, shared actions; business persistence untouched |
| maroLogo | Intro, steps, labels, SearchableSelect, ColorEditor, logo-type/type/reference/review cards | Smaller headings, readable labels, listbox keyboard handling, valid color input HEX values, selected check contrast; three-step wizard and generation behavior retained |
| Auth | AuthLayout, AuthPanel, email request/reset routes, LoginAdPanel | Shared field roles, semantic success/error alerts, readable text scale, named input controls, visible ad-action focus; providers and auth behavior unchanged |
| Account / settings | Profile, preferences, workspaces/detail, security/danger sections | 14/16px functional type, readable labels, 44px sidebar rows, inverse-foreground correction, responsive stacked panels |
| Pricing / subscription | Pricing overview, credit/subscription/checkout wrappers and shared modals | 32px title, readable hierarchy and controls; payment/plan contracts untouched |
| Discovery / presets | PresetCard, prompts filters/search, explore/creator links | Flat cards, no decorative glass/shadows, semantic selection and scrim foregrounds; art and likes behavior retained |
| Editor chrome | ChatPanel, ContentPanel, VisualEditPanel and tool sidebar cards | Black foreground on lime, theme-aware inverse foreground; generated website previews retain their own design |
| Admin / lists / tables | Existing engine, commerce, operations and admin route inventory, shared fields/modal/table/loading primitives | Tokens/focus/field fixes apply globally; isolated lime button foregrounds corrected. Dense table structure, pagination/data/admin actions retained |
| Overlays / feedback | Modal, menus, tooltips, Toast, notifications, PlatformNotices, badges | Theme-specific elevation, layering, keyboard handling, status/error semantics, readable muted text, long-text wrapping, safe-area placement |
| Native controls | Checkbox/radio/range/file/color inputs, switch/upload controls | Semantic checked/focus colors, readable checked mark, existing native behavior, labeled color/upload inputs |
| Responsive / motion | Mobile dock, drawer, form grids, account layouts, horizontal nav/tabs | Existing collapse/scroll architecture retained; viewport-bound menus and targets improved; reduced-motion rules retained |

## Problems fixed

The previous system had stale light-only/shadowless documentation, weak light-mode muted/status colors, blanket transparent borders and control styling, focus-outline removal, a field selector that outranked error/disabled states, white foreground on protected lime, dropped icon-button children, large product titles, oversized hub vertical gaps, isolated gray font variants, and floating UI without consistent elevation/focus behavior. The refinement fixes these through the existing token and component architecture.

The protected primary remains `#00ff72`. Manrope and the Qelt/Mshelt account preference/bootstrap contract remain intact. Intentional brand artwork, generated content palettes, logo font previews and the paper mockup shadow are preserved rather than normalized into chrome.

## Visual verification boundary

Browser checks use real production components in a local fixture with deterministic, fake account/workspace/API data. This allows keyboard, theme, layout and error-state checks without generation credits, purchases, account changes or database writes. Logo preview font samples use Manrope in this esbuild fixture because Next's font compiler is unavailable there; the production build retains all actual preview fonts. Admin write actions, payments and paid generation are not submitted. Core browser screenshots and a width matrix are saved outside the source checkout at `../ui-refinement-20261001/`.

See `docs/UI_REFINEMENT_VALIDATION.md` for checks and `MARO_UI_SYSTEM.md` / `MARO_UI_RULES.md` for the resulting implementation contract.
