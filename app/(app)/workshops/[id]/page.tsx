import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/page-auth";
import { getWorkshop } from "@/lib/workshops";
import { listRegistrations } from "@/lib/registrations";
import { formatWorkshopTime } from "@/lib/time";
import { NoAccess } from "@/components/NoAccess";
import { RegistrationPanel } from "@/components/RegistrationPanel";
import { HistoryList } from "@/components/HistoryList";
import { SeatsLeft, StatusBadge } from "@/components/ui";

const tabClass = (active: boolean) =>
  `btn ${active ? "bg-sage-tint text-sage-ink" : "text-muted hover:bg-white"}`;

export default async function WorkshopPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const { user, allowed } = await requirePage(["manager", "staff"]);
  if (!allowed) return <NoAccess />;

  const workshop = await getWorkshop(params.id);
  if (!workshop) notFound();

  const registrations = await listRegistrations(workshop.id);
  const tab = searchParams.tab === "history" ? "history" : "registrations";

  return (
    <div className="space-y-6">
      <Link href="/workshops" className="inline-block text-sm text-muted hover:underline">
        ← All workshops
      </Link>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-xl">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm text-muted">{workshop.code}</span>
              <StatusBadge workshop={workshop} />
            </div>
            <h1 className="mb-2">{workshop.title}</h1>
            <p className="font-medium">
              {formatWorkshopTime(workshop.startsAt)} · {workshop.durationMinutes} min
            </p>
            <p className="text-muted">
              {workshop.location} · with {workshop.instructor}
            </p>
            {workshop.description && <p className="mt-3">{workshop.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-4">
            <SeatsLeft workshop={workshop} />
            {user.role === "manager" && (
              <Link href={`/workshops/${workshop.id}/edit`} className="btn-quiet">
                Edit workshop
              </Link>
            )}
          </div>
        </div>
      </section>

      <nav aria-label="Workshop sections" className="flex gap-2">
        <Link
          href={`/workshops/${workshop.id}`}
          aria-current={tab === "registrations" ? "page" : undefined}
          className={tabClass(tab === "registrations")}
        >
          Registrations
        </Link>
        <Link
          href={`/workshops/${workshop.id}?tab=history`}
          aria-current={tab === "history" ? "page" : undefined}
          className={tabClass(tab === "history")}
        >
          History
        </Link>
      </nav>

      {tab === "history" ? (
        <section className="card">
          <h2 className="mb-1">History</h2>
          <p className="mb-4 text-muted">Every registration and cancellation, newest first. Nothing is ever deleted.</p>
          <HistoryList registrations={registrations} />
        </section>
      ) : (
        <RegistrationPanel workshop={workshop} registrations={registrations} />
      )}
    </div>
  );
}