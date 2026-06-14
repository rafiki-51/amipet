export default function CustomerOrderDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="h-44 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          </div>
          <div className="space-y-5">
            <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </main>
  );
}
