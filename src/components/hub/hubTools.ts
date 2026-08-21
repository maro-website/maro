/**
 * maroHub primary-card configuration.
 *
 * To replace a card image, edit only the `backgroundImage` value for that
 * product below. Internal tool IDs intentionally remain compatible with the
 * generation routes (for example, maroAudio still uses the canonical `zo`).
 */
export const HUB_TOOLS = [
  {
    id: "imazh",
    label: "maroImazh",
    toolId: "reklama",
    href: "/imazh",
    backgroundImage: "/images/hub/marketing-stack.png",
  },
  {
    id: "logo",
    label: "maroLogo",
    toolId: "logo",
    href: "/marologo",
    backgroundImage: "/images/hub/marketing-stack.png",
  },
  {
    id: "web",
    label: "maroWeb",
    toolId: "website",
    href: "/web",
    backgroundImage: "/images/hub/marketing-stack.png",
  },
  {
    id: "filma",
    label: "maroFilma",
    toolId: "filma",
    href: "/filma",
    backgroundImage: "/images/hub/marketing-stack.png",
    locked: true,
  },
  {
    id: "audio",
    label: "maroAudio",
    toolId: "zo",
    href: "/audio",
    backgroundImage: "/images/hub/marketing-stack.png",
    locked: true,
  },
] as const;
