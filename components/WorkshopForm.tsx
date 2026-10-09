"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkshopView } from "@/lib/workshops";
import { api } from "@/lib/api-client";
import { LOCATIONS, STATUS_LABEL, WORKSHOP_STATUSES } from "@/lib/constants";
import { CENTRE_TZ, utcToZonedInput, zonedInputToUtc } from "@/lib/time";
import { Field, Notice } from "./ui";
import { useToast } from "./Toast";

export function WorkshopForm({ workshop }: { workshop?: WorkshopView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const localStart = String(f.get("startsAt") ?? "");

    const payload = {
      code: f.get("code"),
      title: f.get("title"),
      instructor: f.get("instructor"),
      location: f.get("location"),
      description: f.get("description"),
      startsAt: localStart ? zonedInputToUtc(localStart, CENTRE_TZ).toISOString() : "",
      durationMinutes: Number(f.get("durationMinutes")),
      capacity: Number(f.get("capacity")),
      status: f.get("status"),
    };

    setBusy(true);
    setError(null);
    const res = workshop
      ? await api<{ workshop: WorkshopView }>(`/api/workshops/${workshop.id}`, "PATCH", payload)
      : await api<{ workshop: WorkshopView }>("/api/workshops", "POST", payload);
    setBusy(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    toast(workshop ? `Saved changes to ${res.data.workshop.title}.` : `Created ${res.data.workshop.title}.`);
    router.push(`/workshops/${res.data.workshop.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5">
      {error && <Notice tone="info">{error}</Notice>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Code" hint="Short and unique, like POT-101.">
          <input name="code" className="input" required maxLength={20} defaultValue={workshop?.code} />
        </Field>
        <Field label="Title">
          <input name="title" className="input" required maxLength={120} defaultValue={workshop?.title} />
        </Field>
        <Field label="Instructor">
          <input name="instructor" className="input" required defaultValue={workshop?.instructor} />
        </Field>
        <Field label="Location">
          <select name="location" className="input" required defaultValue={workshop?.location ?? LOCATIONS[0]}>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date and time" hint={`Times are in ${CENTRE_TZ}.`}>
          <input
            name="startsAt"
            type="datetime-local"
            className="input"
            required
            defaultValue={workshop ? utcToZonedInput(workshop.startsAt, CENTRE_TZ) : ""}
          />
        </Field>
        <Field label="Duration (minutes)">
          <input
            name="durationMinutes"
            type="number"
            className="input"
            required
            min={15}
            max={720}
            step={5}
            defaultValue={workshop?.durationMinutes ?? 60}
          />
        </Field>
        <Field
          label="Capacity"
          hint={workshop ? `Can't go below ${workshop.activeCount} (already registered).` : "How many seats in total."}
        >
          <input
            name="capacity"
            type="number"
            className="input"
            required
            min={workshop?.activeCount ?? 0}
            max={500}
            defaultValue={workshop?.capacity ?? 20}
          />
        </Field>
        <Field label="Status" hint="Only open workshops can take registrations.">
          <select name="status" className="input" defaultValue={workshop?.status ?? "draft"}>
            {WORKSHOP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description (optional)">
        <textarea name="description" rows={3} className="input" maxLength={2000} defaultValue={workshop?.description} />
      </Field>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : workshop ? "Save changes" : "Create workshop"}
        </button>
        <button type="button" className="btn-quiet" onClick={() => router.back()}>
          Never mind
        </button>
      </div>
    </form>
  );
}