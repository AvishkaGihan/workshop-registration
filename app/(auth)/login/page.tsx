import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <p className="mb-1 text-lg font-semibold text-sage-ink">
          Workshop Desk
        </p>
        <h1>Welcome back</h1>
        <p className="mt-2 text-muted">
          Sign in to register people and check seats.
        </p>
      </div>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}
