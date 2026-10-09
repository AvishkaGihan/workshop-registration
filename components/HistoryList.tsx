import type { RegistrationView } from "@/lib/registrations";
import { formatStamp } from "@/lib/time";

type HistoryEvent = { key: string; at: string; text: React.ReactNode };

export function HistoryList({ registrations }: { registrations: RegistrationView[] }) {
  const events: HistoryEvent[] = registrations
    .flatMap((r) => {
      const items: HistoryEvent[] = [
        {
          key: `${r.id}-registered`,
          at: r.registeredAt,
          text: (
            <>
              <strong>{r.registeredBy}</strong> registered <strong>{r.attendeeName}</strong> ({r.attendeeEmail}).
            </>
          ),
        },
      ];
      if (r.status === "cancelled" && r.cancelledAt) {
        items.push({
          key: `${r.id}-cancelled`,
          at: r.cancelledAt,
          text: (
            <>
              <strong>{r.cancelledBy}</strong> cancelled <strong>{r.attendeeName}</strong>&apos;s registration.
              {r.cancelReason ? ` Reason: ${r.cancelReason}` : ""}
            </>
          ),
        });
      }
      return items;
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  if (events.length === 0) return <p className="text-muted">Nothing has happened here yet.</p>;

  return (
    <ol className="divide-y divide-line">
      {events.map((e) => (
        <li key={e.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
          <span className="w-36 shrink-0 text-sm text-muted">{formatStamp(e.at)}</span>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}