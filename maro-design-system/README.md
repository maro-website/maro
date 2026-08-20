# LEGACY — maro Design System

Ky sistem nuk është më burim vizual për **maro.al**. Ruhet për histori dhe për asetet ekzistuese, por aplikacioni duhet të përdorë vetëm [`../maro-final-design-system`](../maro-final-design-system).

## Start here

1. Read [`MARO-DESIGN-SYSTEM.md`](./MARO-DESIGN-SYSTEM.md). It is the source of truth for brand, product UI, responsive behavior, accessibility, voice, and implementation.
2. Import [`tokens/maro.css`](./tokens/maro.css) into the app before component styles.
3. Use [`tokens/maro.tokens.json`](./tokens/maro.tokens.json) when generating themes, Tailwind presets, mobile tokens, or Figma variables.
4. Keep [`.cursor/rules/maro-design-system.mdc`](./.cursor/rules/maro-design-system.mdc) enabled so Cursor follows the system automatically.
5. Open [`guide/index.html`](./guide/index.html) for the visual reference.
6. Optionally import [`components/maro-primitives.css`](./components/maro-primitives.css) for framework-neutral component foundations.
7. Browse [`icons/index.html`](./icons/index.html) for the searchable 78-icon library and use [`icons/manifest.json`](./icons/manifest.json) for tooling.

## File map

```text
maro-design-system/
├─ maro-logo.svg                    Official horizontal lockup
├─ maro-symbol.svg                  Official standalone symbol
├─ maro-symbol-white.svg            Approved inverse symbol geometry
├─ assets/partners/
│  └─ nice-logo-white.svg           Supplied inverse NICE.al partner lockup
├─ MARO-DESIGN-SYSTEM.md            Canonical human + AI specification
├─ tokens/
│  ├─ maro.css                      Production CSS custom properties
│  └─ maro.tokens.json              Platform-neutral design tokens
├─ components/
│  └─ maro-primitives.css           Reusable component baseline
├─ icons/
│  ├─ *.svg                         78 normalized solid icons
│  ├─ manifest.json                 Names, categories, aliases, provenance
│  └─ index.html                    Searchable icon preview
├─ scripts/
│  └─ import-icons.ps1              Reproducible source normalization
├─ .cursor/rules/
│  └─ maro-design-system.mdc        Persistent Cursor implementation rules
└─ guide/
   ├─ index.html                    Browsable visual guide
   ├─ guide.css
   └─ guide.js
```

## Non-negotiables

- Manrope is the only UI typeface.
- Figma tracking `-30` maps to CSS `letter-spacing: -0.03em`, never `-30px`.
- Use semantic tokens; do not scatter raw hex values through components.
- Blue means selected, active, linked, or primary action. Red is destructive or exceptional.
- The interface is quiet, spacious, flat, and functional. Use contrast and spacing before shadows.
- White surfaces sit on the soft gray canvas; near-black is used for the strongest hierarchy.
- The supplied SVG files are the only approved logo artwork.
- Product UI uses the canonical solid 24×24 icons in `icons/`; do not mix in outline icons.

## Quick use

```css
@import "./tokens/maro.css";

body {
  background: var(--maro-color-bg-canvas);
  color: var(--maro-color-text-primary);
  font-family: var(--maro-font-family);
}
```

The system is framework-neutral. Components may be implemented in React, Vue, Svelte, or server-rendered HTML as long as their anatomy, tokens, states, and behavior follow the canonical specification.

## Icons

Icons use `viewBox="0 0 24 24"`, `fill="currentColor"`, and kebab-case filenames. Use 20px by default, 16px for metadata, and 24px for major navigation. Inline SVG or CSS masks allow semantic color inheritance; an external `<img>` is suitable only when its default black color is intended.
