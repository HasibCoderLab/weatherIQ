import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-outline-variant px-6 py-16 text-center">
      <span aria-hidden="true" className="material-symbols-outlined text-4xl text-on-surface-muted/60">
        wrong_location
      </span>
      <h1 className="text-lg font-semibold text-on-surface">Page not found</h1>
      <p className="max-w-sm text-sm text-on-surface-muted">
        The page you were looking for doesn&apos;t exist. Head back to the dashboard to check the
        weather.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
