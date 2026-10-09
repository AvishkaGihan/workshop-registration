"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Field, Notice } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const res = await api<{ user: { role: string } }>(
      "/api/auth/login",
      "POST",
      {
        email: form.get("email"),
        password: form.get("password"),
      },
    );

    if (!res.ok) {
      setError(res.message);
      setBusy(false);
      return;
    }
    router.replace(
      res.data.user.role === "admin" ? "/admin/users" : "/workshops",
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Notice tone="info">{error}</Notice>}
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="input"
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </Field>
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
