import { ProductCard } from "@/components/products/ProductCard";
import { siteConfig } from "@/config/site";
import { getActiveDeliveryZones, getActiveProducts } from "@/lib/products-db";
import type { Product } from "@/types/product";

export default async function CatalogoPage() {
  let products: Product[] = [];
  let coverageZones = siteConfig.coverage;

  try {
    products = await getActiveProducts();
  } catch (error) {
    console.error("Failed to load catalog products from Supabase", error);
    products = [];
  }

  try {
    const deliveryZones = await getActiveDeliveryZones();

    if (deliveryZones.length > 0) {
      coverageZones = deliveryZones.map((zone) => zone.name);
    }
  } catch (error) {
    console.error("Failed to load delivery zones from Supabase", error);
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          {siteConfig.name}
        </p>

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Catálogo</h1>

        <p className="mt-4 max-w-2xl text-slate-600">
          Explorá productos disponibles para perros y gatos con delivery gratis
          en nuestra zona de cobertura.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {coverageZones.map((zone) => (
            <span
              key={zone}
              className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
            >
              {zone}
            </span>
          ))}
        </div>

        {products.length > 0 ? (
          <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <p className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
            No hay productos disponibles actualmente
          </p>
        )}
      </div>
    </main>
  );
}
