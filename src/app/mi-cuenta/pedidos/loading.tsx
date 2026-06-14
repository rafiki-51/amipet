export default function CustomerOrdersLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-5 w-36 rounded bg-slate-200" />
        <div className="mt-8 h-4 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-10 w-64 rounded bg-slate-200" />
        <div className="mt-4 h-5 max-w-xl rounded bg-slate-200" />
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
