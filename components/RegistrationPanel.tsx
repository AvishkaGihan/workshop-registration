"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkshopView } from "@/lib/workshops";
import type { RegistrationView } from "@/lib/registrations";
import { api } from "@/lib/api-client";
import { STATUS_LABEL } from "@/lib/constants";
import { formatStamp } from "@/lib/time";
import { Field, Notice } from "./ui";
import { useToast } from "./Toast";

type MessageResponse = { message: string };

export function RegistrationPanel({
  workshop,
  registrations,
}: {
  workshop: WorkshopView;
  registrations: RegistrationView[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const isOpen = workshop.status === "open";
  const canRegister = isOpen && !workshop.isFull;
  const cancelledCount = registrations.filter((r) => r.status === "cancelled").length;
  const visible = showCancelled ? registrations : registrations.filter((r) => r.status === "active");

  // Always re-fetch from the server so the seat count can be trusted.
  const refresh = () => startTransition(() => router.refresh());

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await api<MessageResponse>(`/api/workshops/${workshop.id}/registrations`, "POST", {
      attendeeName: name,
      attendeeEmail: email,
    });
    setBusy(false);

    if (res.ok) {
      toast(res.data.message);
      setName("");
      setEmail("");
      nameRef.current?.focus();
    } else {
      // 400 and 409 are things to fix or simply how things are ("just filled up"), not failures.
      toast(res.message, res.status === 409 || res.status === 400 ? "info" : "error");
    }
    refresh();
  }

  async function cancel(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await api<MessageResponse>(`/api/registrations/${id}/cancel`, "POST", {
      reason: reason.trim() || undefined,
    });
    setBusy(false);

    if (res.ok) toast(res.data.message);
    else toast(res.message, res.status === 409 ? "info" : "error");

    setConfirmingId(null);
    setReason("");
    refresh();
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-4">Register someone</h2>
        {canRegister ? (
          <form onSubmit={register} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Name">
              <input
                ref={nameRef}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </Field>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Registering…" : "Register"}
            </button>
          </form>
        ) : (
          <Notice tone="info">
            {isOpen
              ? "This workshop is full. Cancel a registration to free up a seat."
              : `Registration is closed because this workshop is ${STATUS_LABEL[workshop.status].toLowerCase()}.`}
          </Notice>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Registrations</h2>
          <label className="flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5 accent-sage"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            <span>Show cancelled ({cancelledCount})</span>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="text-muted">
            {registrations.length === 0
              ? "No registrations yet. Add the first attendee above."
              : "No active registrations right now."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="py-2 pr-4 font-medium">Attendee</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Registered</th>
                  <th className="py-2 pr-4 font-medium">Cancelled</th>
                  <th className="py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-line align-top">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.attendeeName}</p>
                        <p className="text-sm text-muted">{r.attendeeEmail}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`badge ${
                            r.status === "active" ? "bg-sage-tint text-sage-ink" : "bg-ash-tint text-ash-ink"
                          }`}
                        >
                          {r.status === "active" ? "Active" : "Cancelled"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        By {r.registeredBy}
                        <br />
                        <span className="text-muted">{formatStamp(r.registeredAt)}</span>
                      </td>
                      <td className="py-3 pr-4 text-sm">
                        {r.status === "cancelled" && r.cancelledAt ? (
                          <>
                            By {r.cancelledBy}
                            <br />
                            <span className="text-muted">{formatStamp(r.cancelledAt)}</span>
                            {r.cancelReason && <p className="mt-1 italic text-muted">“{r.cancelReason}”</p>}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {r.status === "active" && (
                          <button
                            type="button"
                            className="btn-quiet !min-h-[40px] !px-3 !py-1 text-sm"
                            onClick={() => {
                              setConfirmingId(r.id);
                              setReason("");
                            }}
                          >
                            Cancel registration
                          </button>
                        )}
                      </td>
                    </tr>

                    {confirmingId === r.id && (
                      <tr className="border-b border-line bg-cream">
                        <td colSpan={5} className="p-4">
                          <p className="font-medium">Cancel {r.attendeeName}&apos;s registration?</p>
                          <p className="mb-3 text-sm text-muted">This frees one seat. The record is kept in history.</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1">
                              <Field label="Reason (optional)">
                                <input
                                  className="input"
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  maxLength={300}
                                />
                              </Field>
                            </div>
                            <button type="button" className="btn-primary" disabled={busy} onClick={() => cancel(r.id)}>
                              Yes, cancel registration
                            </button>
                            <button
                              type="button"
                              className="btn-quiet"
                              onClick={() => {
                                setConfirmingId(null);
                                setReason("");
                              }}
                            >
                              Keep it
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}