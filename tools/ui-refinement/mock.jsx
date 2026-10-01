import React from "react";
import { emptyBrainProfile } from "@/lib/workspaces/brainTypes";
import { DEFAULT_PRICING } from "@/lib/supabase/types";
import { DEFAULT_LOGO_CONTENT } from "@/lib/marologo/content";

// Next's font compiler is unavailable in esbuild. Production keeps its real fonts.
const fixtureFont = () => ({ className: "fixture-preview-font", style: { fontFamily: "Manrope" } });
export const Inter = fixtureFont, Sora = fixtureFont, Source_Sans_3 = fixtureFont,
  Libre_Baskerville = fixtureFont, Cormorant_Garamond = fixtureFont, Bebas_Neue = fixtureFont,
  Caveat = fixtureFont, Syne = fixtureFont, Manrope = fixtureFont;

const Context = React.createContext(null);
const noop = async () => ({});
const workspaces = [{ id: "qa-workspace-a", name: "Maro Workspace #1" }, { id: "qa-workspace-b", name: "Workspace me një emër shumë të gjatë për kontrollin e truncation" }];
export function FixtureProvider({ children }) {
  const [id, setId] = React.useState(() => localStorage.getItem("maro.ui.qa.account") || "qa-a");
  const [active, setActive] = React.useState(workspaces[0]);
  const value = React.useMemo(() => ({ ready: true, supabaseReady: true, user: { id, name: "Maro QA", email: "ui-qa@example.invalid", avatarColor: id === "qa-b" ? "#00ff72" : undefined }, credits: 35,
    creations: [], projects: [], activeWorkspaceScope: active.id, isAdmin: false, session: null,
    getAccessToken, signOut: noop, updateAvatar: noop, updateProfileName: noop, addProject: noop, addCreation: noop, spendCredits: noop,
    signIn: async () => ({ error: "Gabim demonstrimi — provo përsëri." }), signUp: noop,
    workspaces, activeWorkspace: active, setActiveWorkspace: async key => setActive(workspaces.find(w => w.id === key)),
    chooseAccount: key => { localStorage.setItem("maro.ui.qa.account", key); setId(key); } }), [id, active]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMaro() { return React.useContext(Context); }
export function useWorkspace() { return React.useContext(Context); }
const router = { push: url => { location.href = url; }, replace: url => { location.href = url; }, refresh: () => location.reload() };
const params = new URLSearchParams(location.search);
export function useRouter() { return router; }
export function usePathname() { return location.pathname === "/hub" ? "/" : location.pathname; }
export function useSearchParams() { return params; }
export function useParams() { return {}; }
export default function Link({ children, ...props }) { return <a {...props}>{children}</a>; }
export async function getAccessToken() { return null; }
export const supabaseConfigured = false;
export function getSupabaseBrowser() { throw new Error("The UI fixture cannot access Supabase"); }
export function useSettings() { return { pricing: DEFAULT_PRICING, toolOptionIcons: {}, fortConfig: {}, loading: false }; }
const models = [{ key: "flare", label: "Flare", customerCredits: 5, descriptor: "Maro", enabled: true, isDefault: true }];
export function useV1ImageModels() { return models; }
export async function fetchPrompts() { return { items: [] }; }
export async function fetchPromptDetail() { throw new Error("Fixture has no remote preset"); }
export async function fetchBrainProfile() { return emptyBrainProfile(); }
export async function fetchWorkspaceSources() { return []; }
export const saveBrainProfile = noop, addWorkspaceSource = noop, deleteWorkspaceSource = noop, uploadSourceImage = noop;
const nativeFetch = window.fetch;
window.fetch = async (url, options) => {
  if (String(url).startsWith("/api/")) {
    if (options?.method && !["GET", "PATCH"].includes(options.method)) throw new Error("Production mutations are unavailable in the UI fixture");
    const data = String(url).includes("logo-content") ? { content: DEFAULT_LOGO_CONTENT } :
      String(url).includes("commerce/catalog") ? { plans: [{ id: "qa-standard", name: "Standard", tagline: "Për punë kreative", priceEur: 19, credits: 100, features: ["Logo", "Imazhe"] }], topups: [], listPriceEurPerCredit: .2 } :
      String(url).includes("image/models") ? { models } : { notifications: [], items: [], orders: [], purchasesEnabled: false };
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (/^https?:/.test(String(url))) throw new Error("External data is unavailable in the UI fixture");
  return nativeFetch(url, options);
};
