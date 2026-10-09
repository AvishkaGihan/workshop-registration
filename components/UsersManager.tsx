"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserView } from "@/lib/users";
import { api } from "@/lib/api-client";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { Field, Notice } from "./ui";
import { useToast } from "./Toast";

export function UsersManager({ users, currentUserId }: { users: UserView[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await api<{ user: UserView }>("/api/users", "POST", {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      role: f.get("role"),
    });
    setBusy(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    toast(`Created ${res.data.user.name} as ${ROLE_LABEL[res.data.user.role]}.`);
    formRef.current?.reset();
    router.refresh();
  }

  async function change(user: UserView, changes: { role?: string; isActive?: boolean }, success: string) {
    const res = await api(`/api/users/${user.id}`, "PATCH", changes);
    if (res.ok) toast(success);
    else toast(res.message, res.status === 409 ? "info" : "error");
    router.refresh(); // also snaps the role dropdown back if the change was refused
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-4">Add a team member</h2>
        <form ref={formRef} onSubmit={createUser} className="space-y-4">
          {error && <Notice tone="info">{error}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input name="name" className="input" required autoComplete="off" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className="input" required autoComplete="off" />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters. Share it with them privately.">
              <input name="password" type="text" className="input" required minLength={8} autoComplete="off" />
            </Field>
            <Field label="Role">
              <select name="role" className="input" defaultValue="staff">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Adding…" : "Add team member"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-4">Team</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line align-middle last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium">
                      {u.name}
                      {u.id === currentUserId && <span className="font-normal text-muted"> (you)</span>}
                    </p>
                    <p className="text-sm text-muted">{u.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      aria-label={`Role for ${u.name}`}
                      className="input !w-auto"
                      value={u.role}
                      onChange={(e) =>
                        change(u, { role: e.target.value }, `${u.name} is now ${ROLE_LABEL[e.target.value as keyof typeof ROLE_LABEL]}.`)
                      }
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${u.isActive ? "bg-sage-tint text-sage-ink" : "bg-ash-tint text-ash-ink"}`}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {u.isActive ? (
                      <button
                        type="button"
                        className="btn-quiet !min-h-[40px] !px-3 !py-1 text-sm"
                        onClick={() => {
                          if (window.confirm(`Deactivate ${u.name}? They won't be able to sign in. Their history is kept.`)) {
                            change(u, { isActive: false }, `${u.name} has been deactivated.`);
                          }
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-quiet !min-h-[40px] !px-3 !py-1 text-sm"
                        onClick={() => change(u, { isActive: true }, `${u.name} can sign in again.`)}
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}