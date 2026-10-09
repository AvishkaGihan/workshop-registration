import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mb-2">We couldn&apos;t find that page</h1>
      <p className="mb-6 text-muted">
        It may have been moved, or the link might be a little off.
      </p>
      <Link href="/" className="btn-primary">
        Back to the start
      </Link>
    </div>
  );
}
