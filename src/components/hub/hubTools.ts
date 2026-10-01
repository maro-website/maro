/**
 * maroHub primary-card configuration.
 *
 * To replace a card image, edit only the `backgroundImage` value for that
 * product below. Internal tool IDs intentionally remain compatible with the
 * generation routes (for example, maroAudio still uses the canonical `zo`).
 */
import { isModuleLive } from "@/lib/modules/availability";

export const HUB_TOOLS = [
  {
    id: "imazh",
    label: "maroImazh",
    toolId: "reklama",
    href: "/imazh",
    backgroundImage: undefined,
  },
  {
    id: "logo",
    label: "maroLogo",
    toolId: "logo",
    href: "/marologo",
    backgroundImage: undefined,
  },
  {
    id: "web",
    label: "maroWeb",
    toolId: "website",
    href: "/web",
    backgroundImage: undefined,
  },
  {
    id: "filma",
    label: "maroFilma",
    toolId: "filma",
    href: "/filma",
    backgroundImage: undefined,
  },
  {
    id: "audio",
    label: "maroAudio",
    toolId: "zo",
    href: "/audio",
    backgroundImage: undefined,
  },
].map((tool) => ({ ...tool, locked: !isModuleLive(tool.toolId) }));
