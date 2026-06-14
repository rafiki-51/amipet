import Link from "next/link";
import { CustomerOrdersClient } from "./CustomerOrdersClient";

export default function CustomerOrdersPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mi cuenta
          </Link>
        </div>

        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Mi cuenta
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Mis pedidos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta el estado y detalle de los pedidos vinculados a tu cuenta.
          </p>
        </header>

        <section className="mt-8">
          <CustomerOrdersClient />
        </section>
      </div>
    </main>
  );
}
