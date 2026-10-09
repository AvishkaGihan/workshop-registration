import type { WorkshopView } from "@/lib/workshops";
import { STATUS_LABEL } from "@/lib/constants";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-sand-tint text-sand-ink",
    error: "bg-clay-tint text-clay-ink",
    success: "bg-sage-tint text-sage-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-base ${styles}`}>
      {children}
    </div>
  );
}

const BADGE_STYLES = {
  open: "bg-sage-tint text-sage-ink",
  draft: "bg-linen-tint text-linen-ink",
  cancelled: "bg-ash-tint text-ash-ink",
  completed: "bg-mist-tint text-mist-ink",
  full: "bg-sand-tint text-sand-ink",
} as const;

/** Colour is always paired with a text label. "Full" is a neutral badge, not an error. */
export function StatusBadge({ workshop }: { workshop: Pick<WorkshopView, "status" | "isFull"> }) {
  const key = workshop.status === "open" && workshop.isFull ? "full" : workshop.status;
  return (
    <span className={`badge ${BADGE_STYLES[key]}`}>{key === "full" ? "Full" : STATUS_LABEL[workshop.status]}</span>
  );
}

/** The most prominent number on every workshop. */
export function SeatsLeft({ workshop: w }: { workshop: WorkshopView }) {
  if (w.status !== "open" || w.isFull) {
    return (
      <div className="text-right">
        <StatusBadge workshop={w} />
        <p className="mt-1 text-sm text-muted">
          {w.activeCount} of {w.capacity} registered
        </p>
      </div>
    );
  }
  return (
    <div className="text-right">
      <p className="text-4xl font-semibold leading-none text-sage-ink">{w.seatsLeft}</p>
      <p className="text-sm text-muted">{w.seatsLeft === 1 ? "seat left" : "seats left"}</p>
    </div>
  );
}