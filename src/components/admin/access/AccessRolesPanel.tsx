"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import {
  ACCESS_ROLE_LABELS,
  isAccessRole,
  type AccessRole,
  type PermissionKey,
} from "@/lib/admin/permissions";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { timeAgo } from "@/lib/utils/format";
import { Check, X } from "lucide-react";

interface PrivilegedUser {
  id: string;
  email: string;
  fullName: string;
  accessRole: AccessRole | null;
  effectiveRole: AccessRole | null;
  isCreator: boolean;
  plan: string | null;
  maroPlan: string | null;
  isSelf: boolean;
}

interface RoleChangeAudit {
  id: string;
  actorId: string | null;
  targetId: string | null;
  beforeRole: string | null;
  afterRole: string | null;
  createdAt: string;
}

interface OverviewData {
  actor: { userId: string; email: string; role: AccessRole };
  roles: Array<{ id: AccessRole; label: string; permissions: PermissionKey[] }>;
  permissionKeys: PermissionKey[];
  matrix: Record<AccessRole, Record<PermissionKey, boolean>>;
  privilegedUsers: PrivilegedUser[];
  recentRoleChanges: RoleChangeAudit[];
}

const ROLE_OPTIONS: Array<{ value: AccessRole | ""; label: string }> = [
  { value: "", label: "Pa rol admin (përdorues normal)" },
  { value: "editor", label: ACCESS_ROLE_LABELS.editor },
  { value: "developer", label: ACCESS_ROLE_LABELS.developer },
  { value: "administrator", label: ACCESS_ROLE_LABELS.administrator },
  { value: "super_admin", label: ACCESS_ROLE_LABELS.super_admin },
];

function roleLabel(role: string | null): string {
  if (!role) return "Pa rol admin";
  return isAccessRole(role) ? ACCESS_ROLE_LABELS[role] : role;
}

export function AccessRolesPanel() {
  const [data, setData] = React.useState<OverviewData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = React.useState("");
  const [lookupUser, setLookupUser] = React.useState<PrivilegedUser | null>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [pendingChange, setPendingChange] = React.useState<{
    user: PrivilegedUser;
    nextRole: AccessRole | null;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [draftRoles, setDraftRoles] = React.useState<Record<string, AccessRole | "">>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/access/overview", { headers });
    const json = (await res.json()) as OverviewData & { error?: string };
    if (!res.ok) {
      setError(json.error ?? "load_failed");
      setLoading(false);
      return;
    }
    setData(json);
    setDraftRoles(
      Object.fromEntries(
        json.privilegedUsers.map((u) => [u.id, u.effectiveRole ?? ""])
      ) as Record<string, AccessRole | "">
    );
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function lookupUserByEmail() {
    setLookupError(null);
    setLookupUser(null);
    const headers = await adminAuthHeaders();
    const res = await fetch(`/api/admin/access/users?email=${encodeURIComponent(lookupEmail)}`, { headers });
    const json = (await res.json()) as { user?: PrivilegedUser; error?: string };
    if (!res.ok) {
      setLookupError(json.error === "not_found" ? "Përdoruesi nuk u gjet." : json.error ?? "lookup_failed");
      return;
    }
    setLookupUser(json.user ?? null);
  }

  function requestRoleChange(user: PrivilegedUser, nextRole: AccessRole | null) {
    const current = user.effectiveRole ?? null;
    if (current === nextRole) return;

    if (user.isSelf && data?.actor.role === "super_admin" && current === "super_admin" && nextRole !== "super_admin") {
      const otherSuperAdmins = (data?.privilegedUsers ?? []).filter(
        (u) => u.effectiveRole === "super_admin" && !u.isSelf
      );
      if (otherSuperAdmins.length === 0) {
        setError("Nuk mund të hiqni rolin Super Admin nga vetja — duhet të paktën një Super Admin tjetër.");
        return;
      }
    }

    setPendingChange({ user, nextRole });
  }

  async function confirmRoleChange() {
    if (!pendingChange) return;
    setBusy(true);
    setError(null);
    const headers = await adminAuthHeaders(true);
    const res = await fetch("/api/admin/users/role", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: pendingChange.user.id,
        accessRole: pendingChange.nextRole,
        reason: "Control Center role change",
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    setPendingChange(null);
    if (!res.ok) {
      if (json.error === "last_super_admin_self_lockout") {
        setError("Nuk mund të hiqni rolin Super Admin nga vetja — duhet të paktën një Super Admin tjetër.");
      } else if (json.error === "insufficient_permission") {
        setError("Vetëm Super Admin mund të caktojë rolin Super Admin.");
      } else {
        setError(json.error ?? "role_change_failed");
      }
      return;
    }
    setLookupUser(null);
    setLookupEmail("");
    await load();
  }

  const canAssignSuperAdmin = data?.actor.role === "super_admin";

  if (loading || !data) {
    return (
      <div className="grid place-items-center py-20">
        {error ? <p className="text-[13px] text-danger">{error}</p> : <Spinner />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">{error}</div>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[15px] font-semibold text-ink">Rolet administrative</h2>
        <p className="mt-1 text-[12px] text-ink-3">
          Katër role të fiksuara RBAC. Përdoruesit normalë dhe Kreatorët nuk janë role admin — plani komercial (maroFort / maro plan) mbetet i ndarë.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.roles.map((role) => (
            <div key={role.id} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
              <div className="text-[13px] font-semibold text-ink">{role.label}</div>
              <div className="mt-1 text-[11px] text-ink-3">{role.permissions.length} leje</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Matrica e lejeve</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="bg-surface-2 text-[10px] uppercase text-ink-3">
              <tr>
                <th className="px-2 py-2">Leja</th>
                {data.roles.map((role) => (
                  <th key={role.id} className="px-2 py-2 text-center">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.permissionKeys.map((key) => (
                <tr key={key}>
                  <td className="px-2 py-1.5 font-mono text-[11px] text-ink-2">{key}</td>
                  {data.roles.map((role) => (
                    <td key={role.id} className="px-2 py-1.5 text-center">
                      {data.matrix[role.id][key] ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-brand" />
                      ) : (
                        <X className="mx-auto h-3.5 w-3.5 text-ink-3" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[15px] font-semibold text-ink">Gjej përdorues për rol admin</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[240px] flex-1">
            <label className="text-[11px] font-semibold text-ink-3">Email</label>
            <Input
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="përdorues@example.com"
            />
          </div>
          <Button variant="outline" onClick={() => void lookupUserByEmail()}>
            Kërko
          </Button>
        </div>
        {lookupError ? <p className="mt-2 text-[12px] text-danger">{lookupError}</p> : null}
        {lookupUser ? (
          <UserRoleRow
            user={lookupUser}
            draftRole={draftRoles[lookupUser.id] ?? lookupUser.effectiveRole ?? ""}
            canAssignSuperAdmin={canAssignSuperAdmin}
            onDraftChange={(role) => setDraftRoles((s) => ({ ...s, [lookupUser.id]: role }))}
            onApply={(role) => requestRoleChange(lookupUser, role)}
          />
        ) : null}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Përdorues me qasje admin</h2>
        <div className="space-y-3">
          {data.privilegedUsers.map((user) => (
            <UserRoleRow
              key={user.id}
              user={user}
              draftRole={draftRoles[user.id] ?? user.effectiveRole ?? ""}
              canAssignSuperAdmin={canAssignSuperAdmin}
              onDraftChange={(role) => setDraftRoles((s) => ({ ...s, [user.id]: role }))}
              onApply={(role) => requestRoleChange(user, role)}
            />
          ))}
          {data.privilegedUsers.length === 0 && (
            <p className="text-[13px] text-ink-3">Asnjë përdorues me rol admin ende.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Ndryshime të fundit të roleve</h2>
          <Link href={ADMIN_ROUTES.operations.audit} className="text-[12px] font-semibold text-brand hover:underline">
            Audit log →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-surface-2 text-[10px] uppercase text-ink-3">
              <tr>
                <th className="px-2 py-2">Nga</th>
                <th className="px-2 py-2">Te</th>
                <th className="px-2 py-2">Kur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.recentRoleChanges.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2">
                    {roleLabel(row.beforeRole)} → {roleLabel(row.afterRole)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-ink-3">
                    {row.targetId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-ink-3">{timeAgo(row.createdAt)}</td>
                </tr>
              ))}
              {data.recentRoleChanges.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-6 text-center text-ink-3">
                    End s&apos;ka ndryshime të regjistruara.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={Boolean(pendingChange)} onClose={() => !busy && setPendingChange(null)} size="sm">
        {pendingChange ? (
          <div className="p-5">
            <h3 className="text-[16px] font-semibold text-ink">Konfirmo ndryshimin e rolit</h3>
            <p className="mt-2 text-[13px] text-ink-2">
              <span className="font-semibold">{pendingChange.user.email}</span>
              <br />
              {roleLabel(pendingChange.user.effectiveRole)} → {roleLabel(pendingChange.nextRole)}
            </p>
            {pendingChange.nextRole === "super_admin" || pendingChange.user.effectiveRole === "super_admin" ? (
              <p className="mt-2 text-[12px] text-warn">
                Ky ndryshim prek qasjen e privilegjuar në Control Center.
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingChange(null)} disabled={busy}>
                Anulo
              </Button>
              <Button onClick={() => void confirmRoleChange()} disabled={busy}>
                {busy ? "Duke ruajtur…" : "Konfirmo"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function UserRoleRow({
  user,
  draftRole,
  canAssignSuperAdmin,
  onDraftChange,
  onApply,
}: {
  user: PrivilegedUser;
  draftRole: AccessRole | "";
  canAssignSuperAdmin: boolean;
  onDraftChange: (role: AccessRole | "") => void;
  onApply: (role: AccessRole | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{user.email}</span>
          {user.isSelf ? <Badge tone="brand">Ti</Badge> : null}
          {user.isCreator ? <Badge tone="neutral">Kreator</Badge> : null}
        </div>
        <div className="mt-1 text-[11px] text-ink-3">
          Rol admin: {roleLabel(user.effectiveRole)} · Plani: {user.plan ?? "free"}
          {user.maroPlan ? ` · maro ${user.maroPlan}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={draftRole}
          onChange={(e) => onDraftChange((e.target.value || "") as AccessRole | "")}
          className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] text-ink"
        >
          {ROLE_OPTIONS.filter((opt) => opt.value !== "super_admin" || canAssignSuperAdmin).map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onApply(draftRole === "" ? null : draftRole)}
          disabled={draftRole === (user.effectiveRole ?? "")}
        >
          Apliko
        </Button>
      </div>
    </div>
  );
}
