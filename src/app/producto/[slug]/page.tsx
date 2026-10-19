import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { formatCurrency } from "@/lib/format";
import { getProductBySlug } from "@/lib/products-db";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const categoryLabels = {
  "alimento-seco": "Alimento seco",
  "alimento-humedo": "Alimento húmedo",
  snacks: "Snacks",
  accesorios: "Accesorios",
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/catalogo"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-brand-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex h-64 items-center justify-center rounded-2xl border border-brand-dark/10 bg-brand-light text-sm text-brand-dark sm:h-80">
            Imagen no disponible
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">
              {product.petType}
            </p>

            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              {product.name}
            </h1>

            <p className="mt-4 break-words leading-7 text-slate-600">{product.description}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Presentación: {product.weight}
              </span>
              <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-brand-purple">
                Categoría: {categoryLabels[product.category] ?? product.category}
              </span>
              <span className="rounded-full bg-brand-light px-3 py-1 text-brand-dark">
                Stock: {product.stock}
              </span>
            </div>

            <div className="mt-8 border-t border-brand-dark/10 pt-6">
              <p className="break-words text-3xl font-bold text-brand-dark">
                {formatCurrency(product.price)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Delivery gratis dentro de la zona de cobertura.
              </p>
            </div>

            <AddToCartButton
              product={product}
              label="Agregar al carrito"
              className="mt-8 min-h-11 w-full rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200 sm:w-auto"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
