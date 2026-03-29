export default function AthleteLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* header skeleton */}
      <div className="border-b border-line px-6 py-5 flex items-center gap-4">
        <div className="w-12 h-12 skeleton skeleton-round" />
        <div className="space-y-2">
          <div className="h-5 w-32 skeleton" />
          <div className="h-3 w-24 skeleton" />
        </div>
        <div className="ml-auto flex gap-3">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="h-10 w-20 skeleton" />
          ))}
        </div>
      </div>
      {/* tab bar */}
      <div className="border-b border-line px-6 flex gap-6">
        {Array.from({length: 5}).map((_, i) => (
          <div key={i} className="h-10 w-24 skeleton rounded-t-lg" />
        ))}
      </div>
      {/* content area */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-line bg-surface">
            <div className="p-4 space-y-3">
              <div className="h-3 w-20 skeleton" />
              <div className="h-6 w-16 skeleton" />
              <div className="h-3 w-32 skeleton" />
            </div>
          </div>
        ))}
        <div className="lg:col-span-2 h-64 rounded-xl border border-line bg-surface">
          <div className="p-4 space-y-3">
            <div className="h-3 w-24 skeleton" />
            <div className="h-48 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
