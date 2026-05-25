import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { Product } from "@/types/product";
import { formatCurrency } from "@/lib/format";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link
        href={`/producto/${product.slug}`}
        className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400"
      >
        Imagen pendiente
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {product.petType}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-600">{product.description}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {product.weight}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {product.category}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Stock disponible: {product.stock}
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/producto/${product.slug}`}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ver detalle
          </Link>

          <AddToCartButton
            product={product}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          />
        </div>
      </div>
    </article>
  );
}
