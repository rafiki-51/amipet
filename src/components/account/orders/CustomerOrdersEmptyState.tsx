import Link from "next/link";

export function CustomerOrdersEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-brand-dark/20 bg-white px-4 py-10 text-center sm:px-6 sm:py-12 shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-brand-dark">
        Todavía no tenés pedidos vinculados a tu cuenta.
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        Cuando un pedido esté vinculado a tu cuenta, podrás consultar acá su
        estado y detalle.
      </p>
      <Link
        href="/catalogo"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Ver catálogo
      </Link>
    </section>
  );
}
