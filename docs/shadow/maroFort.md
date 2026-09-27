# maroFort — parked

maroFort is temporarily hidden while maroBrain remains the active brand context feature.

## Restore

Set `MARO_FORT_ENABLED` to `true` in `src/lib/shadow/maroFort.ts`, run the tests and build, then deploy. Existing admin configuration, module availability and plan eligibility still apply.

## Preserved code and data

- UI: `src/components/fort/`, the composer and logo wizard integrations.
- Schema, brief builder and prompt layers: `src/lib/fort/`.
- Engine integrations: `src/lib/engine/`.
- Database configuration, subscription plans, stored generations and browser expert values are preserved. No migration or data deletion is needed.

The central switch hides controls, historical badges, the demo and admin entry points. Generation APIs and both prompt compilers discard incoming Fort payloads while parked, including payloads from stale browser sessions. Public settings report Fort disabled. Commercial plan benefits and maroBrain are independent and remain unchanged.

The source stays in its original folders to preserve imports and make restoration a single switch, without duplicate copies that drift apart.
