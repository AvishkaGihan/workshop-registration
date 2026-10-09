import { notFound } from "next/navigation";
import { requirePage } from "@/lib/page-auth";
import { getWorkshop } from "@/lib/workshops";
import { NoAccess } from "@/components/NoAccess";
import { WorkshopForm } from "@/components/WorkshopForm";

export default async function EditWorkshopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { allowed } = await requirePage(["manager"]);
  if (!allowed) return <NoAccess />;

  const workshop = await getWorkshop(id);
  if (!workshop) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1>Edit workshop</h1>
        <p className="text-muted">{workshop.code} · {workshop.title}</p>
      </div>
      <WorkshopForm workshop={workshop} />
    </div>
  );
}