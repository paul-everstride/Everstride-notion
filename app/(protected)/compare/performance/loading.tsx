export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-canvas animate-pulse">
      {/* toolbar */}
      <div className="border-b border-line bg-surface px-4 py-3 space-y-3">
        <div className="flex gap-3">
          <div className="h-8 w-40 rounded-md bg-surfaceStrong" />
          <div className="h-8 w-32 rounded-md bg-surfaceStrong" />
        </div>
        <div className="flex gap-2">
          {Array.from({length: 4}).map((_, i) => <div key={i} className="h-7 w-16 rounded bg-surfaceStrong" />)}
        </div>
      </div>
      {/* chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface h-64" />
        ))}
      </div>
    </div>
  );
}
