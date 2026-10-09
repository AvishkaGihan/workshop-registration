import Link from "next/link";

export function NoAccess() {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <h1 className="mb-2">You don&apos;t have access to this page</h1>
      <p className="mb-5 text-muted">
        Your role doesn&apos;t include this area. If you think that&apos;s a mistake, please ask an Admin.
      </p>
      <Link href="/" className="btn-primary">
        Take me back
      </Link>
    </div>
  );
}