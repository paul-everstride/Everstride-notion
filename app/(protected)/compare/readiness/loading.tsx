export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* toolbar */}
      <div className="border-b border-line bg-surface px-4 py-3 space-y-3">
        <div className="flex gap-3">
          <div className="h-8 w-40 skeleton" />
          <div className="h-8 w-32 skeleton" />
        </div>
        <div className="flex gap-2">
          {Array.from({length: 4}).map((_, i) => <div key={i} className="h-7 w-16 skeleton" />)}
        </div>
      </div>
      {/* chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface h-64">
            <div className="p-4 space-y-3">
              <div className="h-3 w-24 skeleton" />
              <div className="h-48 skeleton rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
