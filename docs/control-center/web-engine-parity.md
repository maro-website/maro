# maroWeb Legacy vs Engine V2 — Semantic Parity Notes

## Legacy assembly (production today)

1. **System prompt** = `buildHtmlGenerateSystem(body, masterPlusOptions)`
   - `masterPlusOptions` = `app_settings.master_prompt` + option fragments + maroFort layer text
   - Includes HTML section specs, theme specs, business metadata

2. **User prompt** = `buildHtmlGenerateUser(body)` + optional `## BRIEF EKSPERT (maroFort)` block

3. **Provider call** = Claude with distinct `system` and `user` parameters (role semantics preserved)

## Engine V2 assembly (dry run / shadow)

1. **System instructions** = live `system_prompt_versions` content + creative option fragments + prompt layers + technical/output blocks

2. **User content** = primary user request + maroBrain context (when mapped) + references

3. **maroFort structured brief** currently lands in `restrictions` / system blocks depending on section

4. **ProviderMessagePackage** exposes:
   - `systemInstructions`
   - `userContent`
   - `systemBlocks[]`
   - `parameters`
   - `debugFlatPreview` (admin only — not the canonical contract)

## Intentional structural differences

| Area | Legacy | Engine V2 |
|------|--------|-----------|
| System content source | `master_prompt` + inline HTML specs from code | Versioned DB system prompt + modular layers |
| Fort brief placement | Appended to **user** message | Structured `restrictions` / system blocks |
| Option fragments | In system stack via `masterPlusOptions` | `creativeDirection` merged into system blocks |
| Brain | Not in web generate route today | Supported via mapping when workspace provided |
| HTML specs | Always injected by `buildHtmlGenerateSystem` | Must be preserved in Engine system prompt or adapter |

## Nothing important lost — adapter requirement for Phase 2B

Phase 2B **must not** flatten everything into one user string for Claude.

The Engine web adapter should map:

```
ProviderMessagePackage.systemInstructions → Claude system
ProviderMessagePackage.userContent (+ fort user blocks if needed) → Claude user
```

Legacy HTML/theme specs from `buildHtmlGenerateSystem` must either:

1. Remain in seeded live system prompt v1, OR
2. Be injected by the web provider adapter as immutable system appendices

## Shadow comparison

When `production_pipeline = shadow` on maroWeb, shadow records store:

- Legacy: `{ systemInstructions, userContent, renderedPreview }`
- Engine: `{ providerMessages, structural diff sections }`

Use Admin → Engine → tool → **Shadow** tab to inspect.
