export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-canvas animate-pulse">
      {/* stat strip skeleton */}
      <div className="border-b border-line bg-surface px-6 py-3 flex gap-6">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surfaceStrong" />
            <div className="space-y-1.5">
              <div className="h-2 w-12 rounded bg-surfaceStrong" />
              <div className="h-3 w-8 rounded bg-surfaceStrong" />
            </div>
          </div>
        ))}
      </div>
      {/* toolbar skeleton */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-line">
        <div className="h-8 w-48 rounded-md bg-surfaceStrong" />
        <div className="h-8 w-24 rounded-md bg-surfaceStrong ml-auto" />
        <div className="h-8 w-20 rounded-md bg-surfaceStrong" />
      </div>
      {/* table skeleton */}
      <div className="px-6 py-4 space-y-2">
        <div className="h-10 rounded-lg bg-surfaceStrong" />
        {Array.from({length: 8}).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface border border-line flex items-center px-4 gap-4">
            <div className="h-4 w-28 rounded bg-surfaceStrong" />
            <div className="h-4 w-10 rounded bg-surfaceStrong ml-auto" />
            <div className="h-4 w-10 rounded bg-surfaceStrong" />
            <div className="h-4 w-10 rounded bg-surfaceStrong" />
            <div className="h-4 w-10 rounded bg-surfaceStrong" />
          </div>
        ))}
      </div>
    </div>
  );
}
