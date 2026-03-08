export default function AdminPedidosPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Panel administrativo
        </p>
        <h1 className="mt-2 text-3xl font-bold">Pedidos</h1>
        <p className="mt-4 text-slate-600">
          Aquí el administrador podrá ver la lista de pedidos y marcarlos como
          entregados.
        </p>
      </div>
    </main>
  );
}