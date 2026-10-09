import Link from "next/link";
import type { WorkshopView } from "@/lib/workshops";
import { formatWorkshopTime } from "@/lib/time";
import { SeatsLeft } from "./ui";

export function WorkshopCard({ workshop: w }: { workshop: WorkshopView }) {
  return (
    <Link
      href={`/workshops/${w.id}`}
      className="card block h-full transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{w.code}</p>
          <h2 className="mb-2">{w.title}</h2>
          <p className="font-medium">{formatWorkshopTime(w.startsAt)}</p>
          <p className="text-muted">{w.location}</p>
          <p className="text-muted">with {w.instructor}</p>
        </div>
        <SeatsLeft workshop={w} />
      </div>
    </Link>
  );
}
