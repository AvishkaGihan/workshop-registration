import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { ROLE_LABEL } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const home = user.role === "admin" ? "/admin/users" : "/workshops";
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href={home} className="text-lg font-semibold text-sage-ink">
              Workshop Desk
            </Link>
            <nav aria-label="Main">
              {user.role === "admin" ? (
                <Link
                  href="/admin/users"
                  className="font-medium hover:underline"
                >
                  Users
                </Link>
              ) : (
                <Link href="/workshops" className="font-medium hover:underline">
                  Workshops
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user.name} · {ROLE_LABEL[user.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
