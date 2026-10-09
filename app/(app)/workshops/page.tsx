import Link from "next/link";
import { requirePage } from "@/lib/page-auth";
import { parseWorkshopFilters } from "@/lib/validation";
import { listWorkshops } from "@/lib/workshops";
import { NoAccess } from "@/components/NoAccess";
import { FilterBar } from "@/components/FilterBar";
import { WorkshopCard } from "@/components/WorkshopCard";

export default async function WorkshopsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, allowed } = await requirePage(["manager", "staff"]);
  if (!allowed) return <NoAccess />;

  const resolvedSearchParams = await searchParams;
  const filters = parseWorkshopFilters(resolvedSearchParams);
  const workshops = await listWorkshops(filters);
  const filtered = Boolean(filters.from || filters.to || filters.status || filters.hasSeats);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Workshops</h1>
          <p className="text-muted">Soonest first. Seats left are always up to date.</p>
        </div>
        {user.role === "manager" && (
          <Link href="/workshops/new" className="btn-primary">
            New workshop
          </Link>
        )}
      </div>

      <FilterBar />

      {workshops.length === 0 ? (
        <div className="card text-center text-muted">
          {filtered ? "No workshops match. Try clearing the filters." : "No workshops yet."}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {workshops.map((w) => (
            <li key={w.id}>
              <WorkshopCard workshop={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}