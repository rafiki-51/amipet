export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          MVP en construcción
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Amipet
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Compra alimento para perros y gatos con entrega local en el este de
          San José, Costa Rica.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-700 shadow-sm">
          Sitio web responsive en desarrollo con Next.js, Tailwind CSS y
          PostgreSQL.
        </div>
      </section>
    </main>
  );
}