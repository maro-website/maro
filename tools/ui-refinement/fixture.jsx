import React from "react";
import { createRoot } from "react-dom/client";
import { FixtureProvider, useMaro } from "./mock.jsx";
import { ThemeProvider, useTheme } from "@/context/theme";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { AppShell } from "@/components/app/AppShell";
import { HubVision } from "@/components/hub-vision/HubVision";
import { ImazhWorkspace } from "@/components/modules/ImazhWorkspace";
import { BrainWorkspace } from "@/components/modules/BrainWorkspace";
import { MaroLogoWizard } from "@/components/marologo/MaroLogoWizard";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import AccountPage from "@/app/account/page";
import PricingPage from "@/app/pricing/page";
import { Button } from "@/components/ui/Button";
import { Input, Field, Textarea, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { EmptyState, Skeleton, Tooltip } from "@/components/ui/Misc";
import { UploadArea } from "@/components/ui/UploadArea";
import { SearchableSelect } from "@/components/marologo/ui/SearchableSelect";
import { ColorEditor } from "@/components/marologo/ui/ColorEditor";
import { Plus, X, Search } from "lucide-react";

function Controls() {
  const [open, setOpen] = React.useState(false), [nested, setNested] = React.useState(false);
  const [checked, setChecked] = React.useState(false), [choice, setChoice] = React.useState("");
  const [colors, setColors] = React.useState(["#00ff72"]), [mode, setMode] = React.useState("custom");
  const { theme, setTheme } = useTheme();
  const { chooseAccount } = useMaro();
  const { toast } = useToast();
  return <div className="maro-page-shell space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="maro-page-title">Maro UI system</h1><AppUserMenu /></div>
    <nav className="maro-toolbar"><Button onClick={() => setTheme(theme === "mshelt" ? "qelt" : "mshelt")}>Qelt / Mshelt</Button><Button onClick={() => chooseAccount("qa-a")}>Account A</Button><Button onClick={() => chooseAccount("qa-b")}>Account B</Button><a href="/hub">Hub</a><a href="/imazh">Imazh</a><a href="/marologo">Logo</a><a href="/brain">Brain</a><a href="/account">Account</a><a href="/pricing">Pricing</a><a href="/sign-in">Login</a></nav>
    <section className="maro-panel space-y-4"><h2 className="maro-text-h3">Veprimet</h2><div className="maro-toolbar">
      <Button icon={<Plus />}>Primary</Button><Button variant="brand">Brand</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Destructive</Button><Button disabled>Disabled</Button><Button loading>Loading</Button><Tooltip content="Shto"><Button size="icon" aria-label="Shto"><Plus /></Button></Tooltip>
      <Dropdown trigger={<Button variant="secondary">Menu QA</Button>} items={[{ label: "Hap" }, { label: "Riemërto" }, { label: "Fshij", danger: true }]} />
      <Button onClick={() => setOpen(true)}>Hap dialogun</Button><Button onClick={() => toast("U ruajt me sukses.")}>Toast QA</Button>
    </div></section>
    <section className="maro-panel maro-form-grid">
      <Field label="Email" hint="Përshkrim i qartë."><Input type="email" placeholder="ti@shembull.com" /></Field>
      <Field label="Emri" error="Plotëso emrin."><Input placeholder="Emri yt" /></Field>
      <Field label="Çaktivizuar"><Input disabled value="Pa ndryshime" readOnly /></Field>
      <Field label="Lloji"><Select><option>Imazh</option><option>Logo</option></Select></Field>
      <Field label="Përshkrimi"><Textarea placeholder="Përshkruaj idenë…" /></Field>
      <SearchableSelect label="Industria" options={["Design", "Technology", "Coffee"]} value={choice} onChange={setChoice} />
      <Switch checked={checked} onChange={setChecked} label="Tekst" />
      <label className="inline-flex items-center gap-2"><input className="maro-native-checkbox" type="checkbox" />Pranoj</label>
      <UploadArea onFiles={() => {}} />
      <ColorEditor mode={mode} values={colors} onModeChange={setMode} onValuesChange={setColors} />
    </section>
    <div className="maro-form-grid"><EmptyState icon={<Search />} title="Asnjë rezultat" description="Provo një kërkim tjetër." /><div className="maro-panel space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-20" /></div></div>
    <Modal open={open} onClose={() => setOpen(false)}><ModalHeader title="Ruaje punën" description="Kontrollo përmbajtjen para se të vazhdosh." /><div className="px-6"><Field label="Titulli"><Input placeholder="Titulli" /></Field></div><ModalFooter><Button variant="secondary" onClick={() => setNested(true)}>Dialog i dytë</Button><Button onClick={() => setOpen(false)}>Ruaj</Button></ModalFooter></Modal>
    <Modal open={nested} onClose={() => setNested(false)}><ModalHeader title="Konfirmimi" /><ModalFooter><Button onClick={() => setNested(false)}>Mbyll të dytin</Button></ModalFooter></Modal>
  </div>;
}
function App() {
  const path = location.pathname;
  if (path === "/sign-in") return <AuthLayout title="Mirë se erdhe" subtitle="Hyr" showSocials><AuthPanel dedicatedPage /></AuthLayout>;
  if (path === "/account") return <AccountPage />;
  if (path === "/pricing") return <PricingPage />;
  if (path === "/hub" || path === "/") return <AppShell><HubVision /></AppShell>;
  if (path === "/imazh") return <AppShell><ImazhWorkspace toolId="reklama" /></AppShell>;
  if (path === "/brain") return <AppShell><BrainWorkspace /></AppShell>;
  if (path === "/marologo") return <AppShell><MaroLogoWizard /></AppShell>;
  return <Controls />;
}
createRoot(document.getElementById("root")).render(<FixtureProvider><ThemeProvider><ToastProvider><App /></ToastProvider></ThemeProvider></FixtureProvider>);
