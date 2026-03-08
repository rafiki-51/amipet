import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { getProductBySlug } from "@/lib/products";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/catalogo"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-sm text-slate-400">
            Imagen pendiente
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              {product.petType}
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-4 text-slate-600">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Presentación: {product.weight}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Categoría: {product.category}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Stock: {product.stock}
              </span>
            </div>

            <div className="mt-8">
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(product.price)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Delivery gratis dentro de la zona de cobertura.
              </p>
            </div>

            <button
              type="button"
              className="mt-8 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}