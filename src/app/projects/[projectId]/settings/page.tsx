"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { ColorInput, Spinner } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import type { LanguageCode } from "@/lib/types";
import { ArrowLeft, Trash2, Globe, Check } from "lucide-react";

const SECTIONS = [
  { key: "general", label: "General" },
  { key: "domain", label: "Domain" },
  { key: "brand", label: "Brand" },
  { key: "danger", label: "Danger Zone" },
] as const;

function SettingsInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject, updateProject, deleteProject } = useMaro();
  const { toast } = useToast();
  const project = getProject(projectId);
  const [active, setActive] = React.useState<(typeof SECTIONS)[number]["key"]>("general");
  const [confirm, setConfirm] = React.useState(false);

  if (!ready) return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;
  if (!project) {
    return (
      <div><AppHeader />
        <div className="grid place-items-center py-32 text-center">
          <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>
    );
  }

  const save = (patch: Parameters<typeof updateProject>[1]) => {
    updateProject(project.id, patch);
    toast("Ndryshimet u ruajtën");
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <button onClick={() => router.push(`/projects/${projectId}`)} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {project.name}
        </button>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">Cilësimet e projektit</h1>

        <div className="mt-6 grid gap-8 md:grid-cols-[200px_1fr]">
          <nav className="flex flex-row gap-1 md:flex-col">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${
                  active === s.key ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"
                } ${s.key === "danger" && active === s.key ? "text-danger" : ""}`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div>
            {active === "general" && (
              <Card title="General">
                <div className="grid gap-4">
                  <Field label="Emri i projektit">
                    <Input defaultValue={project.name} onBlur={(e) => save({ name: e.target.value })} />
                  </Field>
                  <Field label="Emri i biznesit">
                    <Input defaultValue={project.businessName} onBlur={(e) => save({ businessName: e.target.value })} />
                  </Field>
                  <Field label="Gjuha">
                    <Select defaultValue={project.language} onChange={(e) => save({ language: e.target.value as LanguageCode })}>
                      <option value="sq">Shqip</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                    </Select>
                  </Field>
                </div>
              </Card>
            )}

            {active === "domain" && (
              <Card title="Domain">
                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-ink">maro Domain</span>
                    <Badge tone="success"><Check className="h-3 w-3" /> Aktiv</Badge>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
                    <Globe className="h-4 w-4 text-brand" />
                    <span className="text-[14px] font-semibold text-ink">{project.previewUrl}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Field label="Custom Domain" optional>
                    <Input placeholder="www.business.com" />
                  </Field>
                  <p className="mt-2 text-[12px] text-ink-3">Verifikimi i DNS simulohet në Phase 1.</p>
                </div>
              </Card>
            )}

            {active === "brand" && (
              <Card title="Brand">
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
                      {project.brand.logoUrl ? (
                        <img src={project.brand.logoUrl} alt="logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[22px] font-extrabold text-ink-3">{project.businessName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-ink">Logo</div>
                      <div className="text-[12.5px] text-ink-3">{project.brand.logoUrl ? "E ngarkuar" : "Nuk ka logo"}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-2 text-[13px] font-semibold text-ink">Ngjyra kryesore</div>
                      <ColorInput value={project.theme.primaryColor} onChange={(v) => updateProject(project.id, (p) => ({ ...p, theme: { ...p.theme, primaryColor: v }, brand: { ...p.brand, primaryColor: v } }))} />
                    </div>
                    <div>
                      <div className="mb-2 text-[13px] font-semibold text-ink">Ngjyra dytësore</div>
                      <ColorInput value={project.theme.secondaryColor} onChange={(v) => updateProject(project.id, (p) => ({ ...p, theme: { ...p.theme, secondaryColor: v }, brand: { ...p.brand, secondaryColor: v } }))} />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {active === "danger" && (
              <div className="rounded-2xl border border-danger/30 bg-danger/[0.03] p-5">
                <h2 className="text-[15px] font-bold text-danger">Danger Zone</h2>
                <p className="mt-1 text-[13.5px] text-ink-2">Fshirja e projektit është e përhershme dhe nuk mund të kthehet.</p>
                <Button variant="danger" className="mt-4" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>
                  Fshij projektin
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm">
        <ModalHeader icon={<Trash2 className="h-5 w-5 text-danger" />} title="Fshij projektin?" description={`"${project.name}" do të fshihet përgjithmonë.`} />
        <ModalFooter>
          <Button variant="ghost" onClick={() => setConfirm(false)}>Anulo</Button>
          <Button variant="danger" onClick={() => { deleteProject(project.id); router.push("/dashboard"); }}>Fshij</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-[15px] font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsInner />
    </AuthGate>
  );
}
