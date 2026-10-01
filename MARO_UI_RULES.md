# Maro UI implementation rules

Read `MARO_UI_SYSTEM.md` before changing Maro chrome. Runtime authority is `maro-final-design-system/tokens/maro-final.css`; shared primitives/layouts and `src/components/ui` implement it.

1. Keep Manrope, protected lime `#00ff72`, Maro icons, creative artwork and Albanian product voice. Use `text-on-accent` on lime in both themes; raw lime is not legible small text on Qelt.
2. Use existing semantic CSS tokens or their Tailwind mappings. No new literal chrome colors, generic gray palettes, `dark:` utilities or second theme provider. Qelt/Mshelt must share geometry and support all interaction states.
3. Use the approved 12/14/16/18/20/24/28–32/40px type hierarchy. Inputs use 16px. Micro text is limited to secondary badges. Don't add dashboard marketing headlines.
4. Use the 4px spacing scale and approved radii. Retain existing compatibility geometry when a wholesale rewrite would destabilize a screen. No new unexplained 13/17/19/27px values.
5. Use shared Button, Input, Textarea, Select, Field, Modal, Toast, EmptyState and loading primitives. Keep the established variant API and business handlers. Icon-only controls need a visible icon and accessible name. Primary/mobile targets should be at least 44px.
6. Include default, hover, active, focus-visible and disabled states; include loading/selected/checked/error/success when relevant. Do not remove focus outlines. Preserve native keyboard editing. Name fields and connect hints/errors.
7. Use flat surface hierarchy for cards. Raised menus/popovers and dialogs may use semantic float/overlay shadows and subtle borders. No decorative generic shadows or glass effects on ordinary UI.
8. Reuse `useDialogFocus` and `useMenuKeyboard` for existing wrappers. Verify Escape, Tab wrapping, nested overlays, scroll locks, trigger restoration and viewport bounds. Use semantic z-index roles.
9. Test mobile stacking, overflow, safe-area spacing and long labels. Wide tools may use workspace containers; reading/settings pages should use content containers. Don't force one max-width onto every route.
10. Support reduced motion and both themes. Functional text aims for WCAG AA contrast; test token pairings and check the rendered UI. Disabled exceptions and literal artwork must not conceal actionable information.
11. User/generated previews and logo font samples are content and may use their independent palettes/fonts. Don't normalize those into Maro chrome. A documented artwork exception is narrow, never a blanket audit exclusion.
12. Do not change API contracts, routes, providers, prompts, auth, credits, billing, database, permission or generation rules for a visual task. Don't edit another dirty checkout. Preserve a restore reference before a broad refinement.

Before delivery run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit:ui`, `node tools/ui-refinement/tokens.mjs --check`, `node tools/ui-refinement/contrast.mjs` and a production build. Review the diff, console and core screens in both modes at desktop/tablet/mobile widths. Preserve the existing theme bootstrap/CSP contract. Deployment uses the existing Railway production web service only, after validation. No new infrastructure, migrations or secret values in evidence.

When introducing a genuinely new pattern, extend the existing system with a specific reason and update its documentation. Do not invent a parallel component family for one screen.
