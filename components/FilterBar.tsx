"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { thisWeekRange } from "@/lib/time";
import { STATUS_LABEL, WORKSHOP_STATUSES } from "@/lib/constants";
import { Field } from "./ui";

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const status = params.get("status") ?? "";
  const hasSeats = params.get("hasSeats") === "true";
  const anyFilter = Boolean(from || to || status || hasSeats);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  return (
    <section
      aria-label="Filter workshops"
      aria-busy={pending}
      className="card space-y-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-quiet"
          onClick={() => update({ ...thisWeekRange() })}
        >
          This week
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => update({ hasSeats: "true", status: "open" })}
        >
          Seats available
        </button>
        {anyFilter && (
          <button
            type="button"
            className="btn-quiet"
            onClick={() =>
              update({ from: null, to: null, status: null, hasSeats: null })
            }
          >
            Clear filters
          </button>
        )}
        {pending && <span className="text-sm text-muted">Updating…</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="From">
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => update({ from: e.target.value || null })}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => update({ to: e.target.value || null })}
          />
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={status}
            onChange={(e) => update({ status: e.target.value || null })}
          >
            <option value="">Any status</option>
            {WORKSHOP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex min-h-[44px] items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-sage"
          checked={hasSeats}
          onChange={(e) =>
            update({ hasSeats: e.target.checked ? "true" : null })
          }
        />
        <span>Only workshops with seats left</span>
      </label>
    </section>
  );
}
