# maro-final-design-system

Ky është sistemi final dhe i vetëm vizual për `maro.al`. Dosja e vjetër `maro-design-system` konsiderohet legacy dhe nuk duhet të importohet nga aplikacioni.

## Vendimet e ngrira

- Vetëm light mode.
- Canvas: `#f9f9f9`; surface: `#ffffff`.
- Font: Manrope; tracking global `-0.03em`.
- UI flat: pa shadows dhe pa strokes dekorative.
- Vijat përdoren vetëm si ndarës strukturorë, sidomos në navigim dhe grupe informative.
- Bluja Maro është accent i vetëm i përgjithshëm. E kuqja është e rezervuar për `maroFort` dhe error/destructive states.
- State colors nuk krijojnë paleta të reja të produktit; përdoren vetëm për feedback semantik.
- Mobile-first: çdo target interaktiv është minimumi 44px; promptbox-i dhe actions kryesore qëndrojnë të arritshme me një dorë.
- Desktop navigation ka 30px ritëm mes çdo elementi dhe divider-i. Divider-i para/pas item-it active ose hover fshihet.
- Ikonat Maro përdoren së pari; Lucide përdoret vetëm si fallback për utility icons që ende nuk ekzistojnë në familjen Maro.

## Autoriteti i tokens

`tokens/maro-final.css` është burimi i vetëm i së vërtetës në runtime. `tokens/maro-final.tokens.json` është mirror për Figma, audit dhe tooling; ai duhet të ndjekë CSS-in, jo anasjelltas.

## Kufiri i sistemit

Sistemi kontrollon ngjyrat, tipografinë, spacing, radius, surfaces, navigimin, controls, promptbox-in, feedback states dhe responsive behavior. Nuk kontrollon auth, kredite, billing, Supabase, routing, prompt compilation ose generation providers.

## Ritmi i krejt website-it

Çdo faqe e produktit përdor të njëjtën hierarki të spacing-ut:

- `30px` për page gutters, panel padding dhe distancën mes seksioneve kryesore.
- `20px` për distancën mes pjesëve të një komponenti, grupeve të formës dhe ndarësve strukturorë.
- `10px` për ikonë/label, label/control, pills dhe actions të afërta.

Ky ritëm aplikohet në Hub, tools, auth, account/workspaces, billing, legal dhe admin. Preview-t e website-ve që gjenerohen nga përdoruesi janë content, jo Maro chrome; ato mund të kenë stilin e zgjedhur nga përdoruesi.

## Komponentet autoritative

- `components/maro-final-primitives.css`: buttons, fields, checkboxes, chips, cards, menus, composer, navigation dhe Hub tiles.
- `components/maro-final-layouts.css`: page shell, header, panels, form grids, lists, dialogs dhe rregullat responsive për gjithë aplikacionin.
- `src/components/ui/*`: React wrappers që përdorin klasat e mësipërme. Mos krijo variant lokal kur primitive ekziston.

Për faqe të reja përdor `maro-page-shell`, `maro-page-header`, `maro-panel`, `maro-section`, `maro-form-grid`, `maro-list` dhe `maro-action-row`. Faqet ekzistuese trashëgojnë normalizimin bazë nga `body[data-maro-ui="final"]`.

## Kontrolli para dorëzimit

Ekzekuto `pnpm audit:ui` dhe `pnpm build`. Auditi ndalon importet runtime të sistemit legacy, dark-mode utilities, decorative shadows dhe backdrop blur në Maro chrome.

## maroFort dhe maroLogo

`maroFort` trajtohet si një shtresë attributes brenda promptbox-it (p.sh. shpejtësi, madhësi dhe kontrolle të avancuara), jo si një sistem i dytë vizual. `maroLogo` mbetet wizard dhe përdor të njëjtat tokens, por me progres narrativ, preview të madh dhe fokus në një vendim për hap.
