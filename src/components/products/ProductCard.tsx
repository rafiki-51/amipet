import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/format";

type ProductCardProps = {
  product: Product;
};

const categoryLabels: Record<Product["category"], string> = {
  "alimento-seco": "Alimento seco",
  "alimento-humedo": "Alimento húmedo",
  snacks: "Snacks",
  accesorios: "Accesorios",
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-sm [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-[-4px] [&_a]:focus-visible:outline-brand-purple">
      <Link
        href={`/producto/${product.slug}`}
        className="flex h-48 items-center justify-center border-b border-brand-dark/10 bg-brand-light text-sm text-brand-dark"
      >
        Imagen no disponible
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 flex-1 basis-36 break-words text-lg font-semibold leading-6 text-brand-dark">{product.name}</h2>
          <span className="shrink-0 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold capitalize text-brand-dark">
            {product.petType}
          </span>
        </div>

        <p className="mt-3 break-words text-sm leading-6 text-slate-600">{product.description}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {product.weight}
          </span>
          <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-brand-purple">
            {categoryLabels[product.category] ?? product.category}
          </span>
        </div>

        <div className="mt-5">
          <p className="break-words text-2xl font-bold text-brand-dark">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Stock disponible: {product.stock}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-3 pt-6">
          <Link
            href={`/producto/${product.slug}`}
            className="min-h-11 flex-1 basis-28 rounded-xl border border-brand-dark/20 px-4 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
          >
            Ver detalle
          </Link>

          <AddToCartButton
            product={product}
            className="min-h-11 flex-1 basis-28 rounded-xl bg-brand-dark px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
          />
        </div>
      </div>
    </article>
  );
}
