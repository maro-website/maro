# UI refinement checks

- `tokens.mjs --write` regenerates the two-theme JSON mirror; `--check` rejects drift.
- `contrast.mjs` checks 96 resolved functional text/status/CTA/focus/input-boundary pairings and the protected lime. `--json` prints the measured ratios.
- `build-production.py` is the October 2026 validation helper. It uses the existing private Railway variable backup under the user's temp directory, never prints values, and writes an ignored build log. For normal CI use `pnpm build` with the existing Railway-managed environment.
- `fixture.jsx` imports real product components; `mock.jsx` supplies fake accounts/workspaces/settings and local-only API responses. No fixture is routed by Next or imported into production. External data and generation POST requests are blocked; notification PATCH responses are simulated locally.
- `build-fixture.mjs` bundles before/after views. The baseline source is extracted from the restore tag; baseline CSS comes from the saved baseline build. It expects `../ui-refinement-20261001/baseline-source` and `baseline-css`; after CSS comes from the final `.next/static/css`.
- `serve.py --baseline` serves the fixture on 3031; `serve.py` serves after on 3032. Both bind only to 127.0.0.1, include path traversal protection, and serve local assets. Use the documented browser UI tools for actual inspection/interactions.

Fixture routes: `/hub`, `/imazh`, `/brain`, `/marologo`, `/account`, `/pricing`, `/sign-in`, `/qa-controls`. `/qa-controls` exercises shared states, theme/account switching, menus, nested dialogs, fields, upload, checkbox/switch, colors, toast and empty/loading states. The fixture is not a substitute for the production smoke test.
