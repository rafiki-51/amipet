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
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Amipet
        </p>
        <h1 className="mt-2 text-3xl font-bold">Carrito</h1>

        {!isHydrated ? (
          <p className="mt-6 text-slate-600">Cargando carrito...</p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Tu carrito está vacío
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Agrega productos del catálogo para preparar tu pedido.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ver catálogo
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.product.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                    <div>
                      <Link
                        href={`/producto/${item.product.slug}`}
                        className="text-lg font-semibold text-slate-900 hover:text-emerald-700"
                      >
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.product.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          {item.product.weight}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          Stock: {item.product.stock}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCurrency(item.product.price)} c/u
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="inline-flex items-center rounded-xl border border-slate-300">
                      <button
                        type="button"
                        className="h-10 w-10 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        aria-label={`Disminuir cantidad de ${item.product.name}`}
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-10 w-10 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
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
                      className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                      onClick={() => removeItem(item.product.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Productos</span>
                  <span className="font-medium text-slate-900">
                    {totalItems}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Delivery</span>
                  <span className="font-medium text-emerald-700">Gratis</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                  <span className="font-semibold text-slate-900">
                    Subtotal
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 flex w-full justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Continuar a checkout
              </Link>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
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
