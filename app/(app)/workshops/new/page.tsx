import { requirePage } from "@/lib/page-auth";
import { NoAccess } from "@/components/NoAccess";
import { WorkshopForm } from "@/components/WorkshopForm";

export default async function NewWorkshopPage() {
  const { allowed } = await requirePage(["manager"]);
  if (!allowed) return <NoAccess />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1>New workshop</h1>
        <p className="text-muted">Save it as a draft first if you&apos;re not ready to open registration.</p>
      </div>
      <WorkshopForm />
    </div>
  );
}