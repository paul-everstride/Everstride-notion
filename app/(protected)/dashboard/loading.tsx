export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* stat strip skeleton */}
      <div className="border-b border-line bg-surface px-6 py-3 flex gap-6">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 skeleton skeleton-round" />
            <div className="space-y-1.5">
              <div className="h-2 w-12 skeleton" />
              <div className="h-3 w-8 skeleton" />
            </div>
          </div>
        ))}
      </div>
      {/* toolbar skeleton */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-line">
        <div className="h-8 w-48 skeleton" />
        <div className="h-8 w-24 skeleton ml-auto" />
        <div className="h-8 w-20 skeleton" />
      </div>
      {/* table skeleton */}
      <div className="px-6 py-4 space-y-2">
        <div className="h-10 skeleton rounded-xl" />
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-surface border border-line flex items-center px-4 gap-4">
            <div className="w-8 h-8 skeleton skeleton-round" />
            <div className="h-3 w-28 skeleton" />
            <div className="h-3 w-10 skeleton ml-auto" />
            <div className="h-3 w-10 skeleton" />
            <div className="h-3 w-10 skeleton" />
            <div className="h-3 w-10 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
