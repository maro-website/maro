# maro-final-design-system

The only runtime visual system for maro.al. Dark-first Mshelt and fully supported Qelt share Manrope, protected lime `#00ff72`, semantic roles, geometry and interaction rules.

Read [`../MARO_UI_SYSTEM.md`](../MARO_UI_SYSTEM.md) for tokens and component usage, and [`../MARO_UI_RULES.md`](../MARO_UI_RULES.md) before adding UI. The older `maro-design-system` folder is legacy and must not be imported by the application.

`tokens/maro-final.css` is the source of truth. The JSON mirror is generated with `node tools/ui-refinement/tokens.mjs --write`. Primitives and layouts are imported once by `src/app/globals.css`. Compatibility aliases preserve existing component APIs.

Everyday panels stay flat. Raised menus, dialogs and floating notices use restrained theme-specific elevation. Creative/generated preview artwork is content and preserves its own palette/fonts. The existing Qelt/Mshelt bootstrap and per-account theme preferences remain authoritative.

Run `pnpm audit:ui`, the token mirror/contrast checks, lint, typecheck, tests and build before delivery. The audit rejects legacy runtime imports, competing `dark:` utilities, generic decorative shadows and backdrop blur in chrome. Semantic `shadow-float`/`shadow-overlay` are permitted for spatially floating UI. A single paper mockup artwork exception is documented in the audit.

This system governs UI presentation only, not auth, credits, billing, Supabase, routing, prompts or generation providers.
