export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <div className="h-11 max-w-xl" />
      <div className="wiq-skeleton h-64 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="wiq-skeleton h-72 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="wiq-skeleton h-40 rounded-2xl" />
          <div className="wiq-skeleton h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
