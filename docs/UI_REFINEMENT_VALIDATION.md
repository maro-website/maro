# UI refinement validation — 1 October 2026

## Identifiable change / restore

Original production commit: `fdb52d737ba7a2ab91a46fc61d7cb2509601bba2`. Exact working-state restore: `pre-ui-system-refinement-2026-10-01` / `0dc627753c0062caa16f79192826c8028511c2ed`. Final UI commit is identified by the annotated release tag `ui-system-refinement-2026-10-01` and the subject `feat(ui): refine and standardize Maro design system`. Resolve its SHA with `git rev-parse 'ui-system-refinement-2026-10-01^{commit}'`. See `UI_REFINEMENT_RESTORE.md` for recovery without destructive resets.

## Technical checks

| Check | Result / boundary |
| --- | --- |
| Baseline production build | PASS on original app source with production flags |
| `pnpm lint` | PASS; the same three pre-existing hook dependency warnings remain |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: 87 files, 1,141 tests; 1 file / 11 tests skipped by existing integration/configuration conditions |
| Final production build | PASS: compilation, types, page generation and route output completed |
| `pnpm audit:ui` | PASS; legacy imports, competing dark utilities, generic chrome shadow/blur violations absent |
| Token mirror | PASS: JSON matches runtime CSS |
| Semantic contrast | PASS: 96 functional pairings across both modes; protected lime unchanged |
| Whitespace / scope | PASS with existing CR-at-EOL formatting accounted for; API/lib/context/theme bootstrap, database and deployment configuration unchanged |

Final build uses the preserved production variable backup without logging values: signup enabled, live launch, Paddle purchases disabled. The host compiler initially required worker permission after sandbox EPERM; the real build passed with that permission. Logs remain local/ignored under `docs/evidence/ui-refinement/`. `contrast.json` and `responsive-matrix.json` are reproducible, non-secret evidence.

Existing lint warnings: `cards.tsx` creation dependencies, `ToolComposer.tsx` latestMessage, and `MaroLogoWizard.tsx` workspace/user dependencies. These are unrelated behavior effects; no new UI lint warning remains. Next 15 also prints its existing `next lint` deprecation notice.

## Browser checks

Actual viewport dimensions were read back and verified (not inferred from the requested size). The core hub, image workspace, Brain, logo wizard intro, account, pricing and login were checked in both modes at 1920, 1440, 1280, 768, 390 and 320px: **84 cases, zero page-level horizontal overflow**. Intentional internal carousel/nav/tab scrolling remains. Browser screenshots at desktop/mobile and before/after hub/Brain views are saved at `../ui-refinement-20261001/screenshots/`.

Verified interactions:

- Shared primary/brand/secondary/ghost/danger/icon/loading/disabled controls; visible 2px focus in both themes.
- Native field label names, hint/error description ids, red error boundary and disabled text/surface actually rendered correctly. Lowered field-selector specificity so error/disabled styles win.
- Generic menu first focus, Home/End, arrows, Escape and trigger restoration.
- SearchableSelect filtering, keyboard movement to the matching option and Enter selection.
- Color HEX input synchronizes the native color value and disables with its mode. User-selected lime avatar initials use black for contrast.
- Modal Shift+Tab wraps, nested dialog Escape closes only the top dialog, scroll lock is retained until the final dialog closes, and focus returns to the correct opener. Mobile dialog and raised surface verified.
- Mobile global drawer opens, scrolls, closes with Escape and restores its trigger. Tool option menus fit at 320px; mobile promptbox expands and retains visible actions.
- Hub greeting clears the overlay header after reserving shell height; workspace picker supports arrows/Enter, long-name truncation and viewport-bound scrolling.
- Per-account theme preferences: account A Qelt, account B defaults Mshelt, switching back and reload preserve A's Qelt. No new theme bootstrap/provider introduced.
- Login error alert with local fixture data; three-step logo brand/direction/presentation navigation stops before generation.
- Core local fixture console checks show no new runtime errors/warnings.

These local checks use actual UI components with fake accounts/data, not a duplicate UI. The fixture substitutes Manrope for Next-compiled logo font samples; the production build retains the original fonts. Generation, payment, auth-provider submission and admin writes are not exercised by fake fixtures. The existing full suite covers the unchanged business boundaries.

## Before / after

Baseline views use app source from the exact restore tag and saved baseline CSS. After views use final source and production CSS. The comparison shows stronger light muted/status contrast, clear error/disabled fields, coherent raised overlays, consistent button/icon/form states, smaller functional titles and a shorter hub greeting stage. Manrope, lime, launch artwork/media, Albanian voice, existing page composition and tool behavior remain recognizable.

## Production handoff / proof

The existing Railway web service and current live source were confirmed with the installed official CLI. Deploy only the validated candidate to `recovery/maro-v1-20260930`, the existing source branch, in project `cb4c8dcc-712d-459d-b01c-96ae9ad29814`, production environment `46f492bd-a88b-4b68-aa5a-455a2707ca10`, web service `4f5a55b0-dc24-4d6e-8d20-669b8d6ecf3d`. No migrations, variables or infrastructure changes are needed.

Post-push deployment ID/status/SHA and live smoke results are recorded outside this candidate's source tree at `../ui-refinement-20261001/production-result.json`; this avoids amending the already deployed commit to record its own SHA. The public `/ui-system-release.json` marker identifies `maro-ui-system-20261001`. The delivery report must only claim deployment success after Railway status and live marker/browser checks pass.
