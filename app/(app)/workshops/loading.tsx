export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="skeleton h-10 w-48" />
      <div className="skeleton h-40" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
    </div>
  );
}