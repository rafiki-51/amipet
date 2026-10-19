"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";

export default function CarritoPage() {
  const {
    items,
    totalItems,
    subtotal,
    isHydrated,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  function handleClearCart() {
    if (window.confirm("¿Querés vaciar el carrito?")) {
      clearCart();
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900 sm:px-6 sm:py-12 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-brand-purple [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-brand-purple">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
          RafaPet
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">Carrito</h1>

        {!isHydrated ? (
          <p className="mt-6 rounded-2xl border border-brand-dark/10 bg-brand-light p-6 text-brand-dark">Cargando carrito...</p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-brand-dark/10 bg-brand-light px-6 py-10 text-center sm:p-10">
            <h2 className="text-xl font-semibold text-brand-dark">
              Tu carrito está vacío
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Agrega productos del catálogo para preparar tu pedido.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90"
            >
              Ver catálogo
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.product.id}
                  className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <Link
                        href={`/producto/${item.product.slug}`}
                        className="rounded-md break-words text-lg font-semibold leading-6 text-brand-dark hover:text-brand-purple hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                        {item.product.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">
                          {item.product.weight}
                        </span>
                        <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">
                          Stock: {item.product.stock}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 text-left sm:text-right">
                      <p className="break-words text-lg font-bold text-brand-dark">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCurrency(item.product.price)} c/u
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="inline-flex shrink-0 items-center rounded-xl border border-brand-dark/20 bg-white">
                      <button
                        type="button"
                        className="h-11 w-11 rounded-lg text-lg font-semibold text-brand-dark transition hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                      >
                        -
                      </button>
                      <span className="min-w-12 px-2 text-center text-sm font-semibold tabular-nums text-brand-dark">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-11 w-11 rounded-lg text-lg font-semibold text-brand-dark transition hover:bg-brand-light disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100"
                        disabled={item.quantity >= item.product.stock}
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        aria-label={`Aumentar cantidad de ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 hover:text-red-800"
                      onClick={() => removeItem(item.product.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit min-w-0 rounded-2xl border border-brand-dark/10 bg-brand-light p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-brand-dark">Resumen</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex flex-wrap justify-between gap-3">
                  <span>Productos</span>
                  <span className="font-medium text-slate-900">
                    {totalItems}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-3">
                  <span>Delivery</span>
                  <span className="font-medium text-brand-dark">Gratis</span>
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-brand-dark/15 pt-3 text-base">
                  <span className="font-semibold text-brand-dark">
                    Subtotal
                  </span>
                  <span className="break-words font-bold tabular-nums text-brand-dark">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 flex min-h-11 w-full items-center justify-center text-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90"
              >
                Continuar a checkout
              </Link>
              <button
                type="button"
                className="mt-3 min-h-11 w-full rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/5"
                onClick={handleClearCart}
              >
                Vaciar carrito
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
