# Hub landing release — 15 October 2026

Approved local prototype: `maro-hub-concept`. Production baseline: `0524eb3252cc8e65771413b343c7675358ef9f6d`.

The verified local source archive and GitHub annotated tag `HUB01-15OCTOBER-BACKUP` preserve the previous production application before this change. Deployment and rollback evidence is stored separately in `hub-live-release-20261015`.

## Scope and integrations

Only the home page content and visible navigation module labels change. The real AppShell, AppTopNav, HubDropdown, NavDrawer, NotificationBell, AppUserMenu, workspace provider, auth, availability checks, credits, commerce endpoints, and generation APIs remain in place. Canonical destination labels and tool IDs retain their original names so icon resolution, permissions and routes are unchanged. The prototype's simulated account/navigation, static preset snapshots, local dialogs and profile storage are not shipped.

The hero reads the existing authenticated workspace selector and guest sign-in routes. Discovery uses the existing permitted preset catalog pagination, sorts by creation date and shows ten real image thumbnails. Opening and applying presets reuses PresetQuickView and the existing detail/attachment workflow. No generation runs from the Hub. Prices come from the canonical commerce catalog; checkout links keep the existing availability, plan, top-up, upgrade and renewal gates. Filma reuses its existing video and viewport/sound behavior. The new footer appears only on the homepage.

## Narrow visual exceptions

This is the user-approved marketing Hub composition. The display-sized hero, generous hero spacing, four product-colored CTA fills, and subtle brand tints intentionally reproduce the reviewed concept; they do not change app chrome or the shared design system. Product artwork and colors come from the existing `MARO_PRODUCTS` registry. All other surfaces and text use current semantic Maro tokens and the existing Qelt/Mshelt provider. Styles are scoped to this page through CSS modules.

LightTunnel is the user-supplied React Bits component under the attached license. Tiny official product icons share pulse positions in its native WebGL shader; matching brand colors come from the canonical registry. It has no added dependencies, is decorative, ignores pointer input, pauses offscreen and in background tabs, and uses a static frame with reduced motion. Carousel controls have at least 44px targets; automatic movement pauses on hover, focus, an open preview, hidden tabs, offscreen state and reduced motion.

No infrastructure, environment, database, payment configuration, model/provider, prompt, auth, access or generation rules are changed.
