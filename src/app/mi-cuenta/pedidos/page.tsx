import Link from "next/link";
import { CustomerOrdersClient } from "./CustomerOrdersClient";

export default function CustomerOrdersPage() {
  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a mi cuenta
          </Link>
        </div>

        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Mi cuenta
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Mis pedidos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Consultá el estado y detalle de los pedidos vinculados a tu cuenta.
          </p>
        </header>

        <section className="mt-8">
          <CustomerOrdersClient />
        </section>
      </div>
    </main>
  );
}
