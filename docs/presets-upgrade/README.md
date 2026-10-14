# maroPresets upgrade

Baseline: `3a303154b4533ca395862faff028762c32d382c8`, freshly cloned from the production branch and matched to successful Railway deployment `70c4a2c3-46b6-4c1d-b06f-48cd86b4f97f`.

The screen uses the user's supplied React Bits CircularCarousel with their orbit, rise, size, aspect, speed, gap, tilt, perspective, momentum, parallax, fade, shade and radius settings. Its photographic content uses real permitted catalog results. The hero sizing adapts to this page instead of reproducing the standalone demo's empty margins.

The user requested colorful tool selectors, larger visual categories and a hero headline. The narrow extension to `MARO_UI_SYSTEM.md` uses official product colors from `getProductBrand` on selectors and selected category circles. Functional text stays semantic; icon surfaces use the existing black on-accent foreground. Photography and the carousel's 22px radius preserve the supplied creative reference.

Discovery reads only permitted catalog pages and sorts them by creation date. Search and categories retain existing endpoint filtering and pagination. The new canonical page is `/presets`. The legacy `/prompts` path permanently redirects with query parameters preserved. Hub links, shared navigation, metadata and login return paths use the new URL. Internal prompt API endpoints and type names remain unchanged.

Cards open a larger confirmation before applying the existing tool-specific attachment. The existing Modal handles focus, Escape, scroll lock and restoration. Confirmation photography uses contain so the complete composition is visible. Hover, keyboard focus, manual pause, page visibility and reduced motion control the carousel. No database, credits or generation behavior changes.

Guest preview update, 15 October: visitors can browse the 12 latest published presets per live tool. The tool-specific allowance keeps each carousel populated even when newer presets are published for another tool. Detail previews use the same allowance. Older presets still require sign-in, and drafts, disabled presets, upcoming tools and hidden master prompts remain excluded. The guest invitation explicitly says 12 and links to sign-in/sign-up for the full catalog.

Validation: 136 test files passed, 1 skipped; 1,674 tests passed, 11 skipped. Lint and TypeScript passed, design audit passed, token mirror matched, all 96 contrast pairs passed. Browser checks covered search, category selection, tool switching, preserved legacy query parameters, preview confirmation, Shift+Tab wrapping, Escape closure, and attaching an allowed guest preset to maroImazh without generating. Responsive checks included desktop, tablet 768px, and mobile 390/320px in Mshelt/Qelt. The temporary theme test route was removed before the production build.
