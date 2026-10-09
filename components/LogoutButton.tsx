"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className="btn-quiet !min-h-[40px] !px-3 !py-1 text-sm">
      Sign out
    </button>
  );
}