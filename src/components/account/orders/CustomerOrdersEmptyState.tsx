import Link from "next/link";

export function CustomerOrdersEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">
        Todavia no tenes pedidos vinculados a tu cuenta.
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        Cuando un pedido este vinculado a tu cuenta, podras consultar aca su
        estado y detalle.
      </p>
      <Link
        href="/catalogo"
        className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Ver catalogo
      </Link>
    </section>
  );
}
