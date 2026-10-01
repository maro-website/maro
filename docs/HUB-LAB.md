# Maro HUB lab

## Concept

A creative workbench in Maro's existing light design system. Three miniature products launch the three live creation tools immediately. A fictional coffee brand, **ditë.**, connects the launcher artwork to an interactive idea → identity → campaign → website story. Shared context and progressively revealed expert controls explain the actual ecosystem.

## Run locally (PowerShell)

```powershell
cd C:\Users\nicep\Desktop\maro-al\maro-al
$env:PUBLIC_LAUNCH_MODE = "live"
pnpm dev
```

- Experiment: http://localhost:3006/hub-lab
- Original HUB: http://localhost:3006/

The process-local launch-mode override allows a signed-out local preview if `.env.local` enables the coming-soon gate. It does not modify the environment file or middleware. Normal authentication and tool permissions still apply.

## Isolation

- New development-only route: `src/app/hub-lab/page.tsx`. Calls `notFound()` whenever `NODE_ENV` is not `development` and carries no-index metadata.
- Presentation code and scoped CSS: `src/components/hub-lab/`.
- No changes to the production HUB, shared layout, global styles, middleware, authentication, Supabase, database schema, payments, subscriptions, credit handling, generation flows, providers, prompts, or tool routes.
- No new dependencies, remote imagery, generated customer claims, or database migrations.
- Existing root providers still operate normally. The new page reads existing user, credit, project, and workspace state. It introduces no extra API requests.

## Existing code reused

- `HUB_TOOLS` owns labels, routes, and availability. Video and audio remain unavailable. There is no fabricated standalone maroChat module.
- `AppUserMenu`, `MaroSymbol`, canonical tool icons, and `formatCredits` retain the existing account/branding conventions.
- Existing Manrope font, Maro design tokens, and installed Framer Motion. Reduced-motion preference is respected; no scroll hijacking or perpetual animation.
- `getFortModuleSchema` and `FortField` drive the actual expert controls. Their state is local, resets on reload, and never calls generation or persistence APIs. These use the code-default schema, not account-specific admin overrides; this is disclosed as a demonstration.
- `BRAIN_TABS` describes the real context categories. Copy describes explicit saved context and keyword-matched sources, not automatic memory of every past generation.
- Recent-project entry appears only when the existing store contains a project. No seeded personalization.

## Interactions

- Direct tool links, subtle expanding desktop launcher, tool-specific artwork responses.
- Ctrl/Cmd+K searchable launcher with native modal focus handling, Escape, and keyboard navigation.
- Four selectable story stages with an explicit next/restart action.
- Six maroBrain context views.
- Expert-mode switch, progressive field groups, and live summary of selected settings.
- Mobile has a featured horizontal tool plus two compact tool entries.

## Verification

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed.
- Next development compilation and `/hub-lab` response succeeded.
- Browser visual checks at 1440×1000, 1280×800, 820×1180, 390×844, and 320×740.
- No horizontal overflow found on tested mobile widths. Small-screen label overlap and tablet artwork wrapping were corrected after screenshot inspection.
- Verified search filtering/Escape, story stages, Brain context selection, Fort switching, field groups, and keyboard slider changes.
- Browser console reported no errors or warnings on the experimental page during testing.
- Existing `/web`, `/marologo`, `/imazh`, and original `/` routes returned 200 and rendered their expected interfaces. No generation was submitted.
- Ctrl+K focused the native search dialog's input; Escape closed it. The smallest-screen correction was rechecked visually.

## Limitations / critique

- The existing user's remote avatar did not load in the test session. Shared account-menu behavior is unchanged.
- Brand visuals are authored CSS/SVG demonstrations, not real AI generation results. Their restrained material rendering is the weakest part of the visual story compared with real, curated output examples.
- No end-to-end generation or payment tests were run: the experiment does not change those flows.
- A production deployment/build was not performed. Production exclusion is enforced directly by the route's server-side environment guard.
