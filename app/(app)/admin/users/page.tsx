import { requirePage } from "@/lib/page-auth";
import { listUsers } from "@/lib/users";
import { NoAccess } from "@/components/NoAccess";
import { UsersManager } from "@/components/UsersManager";

export default async function UsersPage() {
  const { user, allowed } = await requirePage(["admin"]);
  if (!allowed) return <NoAccess />;

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1>Team accounts</h1>
        <p className="text-muted">
          Create accounts, change roles, or deactivate someone. Accounts are
          never deleted, so history stays intact.
        </p>
      </div>
      <UsersManager users={users} currentUserId={user.id} />
    </div>
  );
}
