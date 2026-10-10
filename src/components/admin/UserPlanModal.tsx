"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Misc";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { userPlanErrorMessage, type AdminUserPlans } from "@/lib/admin/userPlans";
import { adminUserErrorMessage } from "@/lib/admin/userDirectory";

const formatDate = (date: string) => new Date(date).toLocaleDateString("sq-AL", {
  day: "numeric", month: "short", year: "numeric",
});

export function UserPlanModal({ user, onClose, onChanged }: {
  user: { id: string; email: string; full_name: string | null };
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = React.useState<AdminUserPlans | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [planId, setPlanId] = React.useState("");
  const [days, setDays] = React.useState("30");
  const [note, setNote] = React.useState("");
  const [mfaCode, setMfaCode] = React.useState("");
  const [grantId, setGrantId] = React.useState(() => crypto.randomUUID());
  const [saving, setSaving] = React.useState(false);
  const busy = React.useRef(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/plan?userId=${encodeURIComponent(user.id)}`, {
        headers: await adminAuthHeaders(), cache: "no-store",
      });
      const json = await res.json() as AdminUserPlans & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "load_failed");
      setData(json);
      return json;
    } catch (err) {
      setError(userPlanErrorMessage(err instanceof Error ? err.message : "load_failed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  React.useEffect(() => {
    let active = true;
    void load().then(json => {
      if (!active || !json) return;
      const current = json.memberships.find(item => !item.suspended && new Date(item.startedAt).getTime() <= Date.now() && new Date(item.expiresAt).getTime() > Date.now());
      const plan = json.plans.find(item => item.id === current?.planId);
      setPlanId(current?.planId ?? "free");
      setDays(String(plan?.duration_days ?? 30));
    });
    return () => { active = false; };
  }, [load]);

  const existing = data?.memberships.find(membership => !membership.suspended && new Date(membership.startedAt).getTime() <= Date.now() && new Date(membership.expiresAt).getTime() > Date.now());
  const changeDraft = () => {
    setGrantId(crypto.randomUUID());
    setError(null);
    setSuccess(false);
  };

  async function grantPlan(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/users/plan", {
        method: "PATCH", headers: await adminAuthHeaders(true),
        body: JSON.stringify({ userId: user.id, planId, durationDays: Number(days), note, grantId, mfaCode, expectedMembershipId: existing?.id ?? null }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        if (json.error === "stale_membership") await load();
        throw new Error(json.error ?? "grant_failed");
      }
      setSuccess(true);
      setNote("");
      setMfaCode("");
      setGrantId(crypto.randomUUID());
      await load();
      onChanged?.();
    } catch (err) {
      const code = err instanceof Error ? err.message : "grant_failed";
      setError(code.startsWith("mfa_") || ["stale_membership", "active_payment", "automatic_subscription"].includes(code) ? adminUserErrorMessage(code) : userPlanErrorMessage(code));
      setMfaCode("");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={() => { if (!busy.current) onClose(); }} size="lg" aria-label="Menaxho planin">
      <ModalHeader title="Plani i përdoruesit" description={user.email} />
      <div className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
        {loading && <div className="flex justify-center py-5"><Spinner className="h-5 w-5" /></div>}
        {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        {success && <p role="status" className="maro-alert" data-tone="success">Plani u ruajt dhe përdoruesi mori njoftim.</p>}
        {!loading && !data && <Button variant="secondary" onClick={() => { setError(null); void load(); }}>Provo përsëri</Button>}
        {data && !loading && (
          <>
            {existing && (
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="font-semibold text-ink">{existing.planName}</p>
                <p className="mt-1 text-sm text-ink-2">{existing.suspended ? "I pezulluar" : "Plan ekzistues"}, deri më {formatDate(existing.expiresAt)}.</p>
              </div>
            )}
            {data.canManage && (
              <form onSubmit={grantPlan} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Plani">
                    <Select required value={planId} disabled={saving} onChange={event => {
                      changeDraft();
                      setPlanId(event.target.value);
                      setDays(String(data.plans.find(plan => plan.id === event.target.value)?.duration_days ?? 30));
                    }}>
                      <option value="" disabled>Zgjedh planin</option>
                      <option value="free">Falas — pa plan aktiv</option>
                      {data.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.display_name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Kohëzgjatja në ditë" hint="Nga dita e aktivizimit.">
                    <Input type="number" min={1} max={365} step={1} required disabled={saving || planId === "free"} value={days}
                      onChange={event => { changeDraft(); setDays(event.target.value); }} />
                  </Field>
                </div>
                <Field label="Arsyeja private" hint="Shihet vetëm nga stafi brenda panelit admin.">
                  <Textarea required minLength={3} maxLength={1000} disabled={saving} value={note}
                    placeholder="P.sh. plan i falur për bashkëpunim"
                    onChange={event => { changeDraft(); setNote(event.target.value); }} />
                </Field>
                <Field label="Konfirmo me MFA" hint="Kodi aktual nga aplikacioni Authenticator.">
                  <Input required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={mfaCode} disabled={saving} onChange={event => setMfaCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" />
                </Field>
                <p className="text-xs leading-relaxed text-ink-3">Aktivizon vetëm qasjen e planit. Kreditet i cakton veçmas nga tabela e përdoruesve.</p>
                <Button type="submit" variant="brand" loading={saving} disabled={!planId || note.trim().length < 3 || mfaCode.length !== 6}>
                  {saving ? "Duke ruajtur…" : "Konfirmo ndryshimin e planit"}
                </Button>
              </form>
            )}
            <div>
              <h3 className="mb-3 text-xl font-semibold text-ink">Historiku i planeve</h3>
              {data.memberships.length === 0 ? <p className="text-sm text-ink-3">Ky përdorues ende nuk ka plan.</p> : (
                <div className="space-y-3">
                  {data.memberships.map(membership => (
                    <div key={membership.id} className="rounded-2xl bg-surface-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{membership.planName}</span>
                        <Badge tone={membership.source === "manual" ? "brand" : "neutral"}>
                          {membership.source === "manual" ? "Manual / i falur" : membership.source === "paid" ? "Pagesë e regjistruar" : "Burim tjetër"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-ink-3">{formatDate(membership.startedAt)} deri më {formatDate(membership.expiresAt)}{membership.suspended ? " · I zëvendësuar / pezulluar" : ""}</p>
                      {membership.source === "manual" && (
                        <>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-ink-2">{membership.note}</p>
                          <p className="mt-2 break-words text-xs text-ink-3">
                            Shtuar manualisht nga {membership.actorEmail ?? "admini"}{membership.grantedAt ? ` më ${formatDate(membership.grantedAt)}` : ""}.
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
