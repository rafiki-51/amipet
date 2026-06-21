import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { formatCurrency } from "@/lib/format";
import { products } from "@/lib/products";
import { getActiveDeliveryZones } from "@/lib/products-db";

const featuredProducts = products
  .filter((product) => product.isActive)
  .slice(0, 3);

const categories = [
  {
    title: "Perros",
    description: "Alimento y productos para perros adultos y cachorros.",
  },
  {
    title: "Gatos",
    description: "Opciones para gatos adultos, snacks y alimento diario.",
  },
  {
    title: "Alimento seco",
    description: "Presentaciones prácticas para compras recurrentes.",
  },
  {
    title: "Alimento húmedo",
    description: "Porciones listas para complementar la alimentación.",
  },
];

const steps = [
  {
    title: "Elegí productos",
    description: "Revisá el catálogo y agregá lo que necesita tu mascota.",
  },
  {
    title: "Confirmá tu pedido",
    description: "Verificá cantidades, datos de contacto y dirección.",
  },
  {
    title: "Recibí en casa",
    description: "Coordinamos la entrega local dentro de la zona de cobertura.",
  },
];

export default async function Home() {
  let coverageZones = siteConfig.coverage;

  try {
    const deliveryZones = await getActiveDeliveryZones();

    if (deliveryZones.length > 0) {
      coverageZones = deliveryZones.map((zone) => zone.name);
    }
  } catch (error) {
    console.error("Failed to load delivery zones from Supabase", error);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="bg-emerald-50/70 px-6 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <div className="mb-6 inline-flex rounded-2xl bg-white p-3 shadow-sm">
              <Image
                src="/images/amipet-logo-primary.png"
                alt="Amipet"
                width={1080}
                height={300}
                priority
                sizes="(max-width: 640px) 280px, (max-width: 1024px) 360px, 420px"
                className="h-auto w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px]"
              />
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {siteConfig.delivery.label}
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Alimento para perros y gatos con delivery local
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Compra productos para tu mascota con entrega en el este de San
              José. Una forma simple de resolver la comida de la semana sin
              salir de casa.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalogo"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Ver catálogo
              </Link>
              <a
                href="#zonas"
                className="rounded-xl border border-emerald-200 bg-white px-6 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Ver zonas de entrega
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Pedido recomendado
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Productos populares para entrega local
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.weight} · Stock {product.stock}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
              Delivery gratis en zonas seleccionadas
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">Compra rápida</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Elegí productos disponibles y armá tu pedido en pocos pasos.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-900">
              {siteConfig.delivery.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              Entrega local dentro de nuestra zona de cobertura.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">Atención local</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Una tienda pensada para familias con mascotas en el este de San
              José.
            </p>
          </div>
        </div>
      </section>

      <section id="zonas" className="bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Cobertura
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Llegamos a zonas clave del este
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {coverageZones.map((zone) => (
              <span
                key={zone}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {zone}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Categorías
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Lo básico para tu mascota
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver todo el catálogo
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.title}
                href="/catalogo"
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="mb-4 h-12 w-12 rounded-full bg-amber-100" />
                <h3 className="font-semibold text-slate-900">
                  {category.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Destacados
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Productos para empezar tu pedido
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ir al catálogo
            </Link>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <article
                key={product.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-slate-400">
                  Imagen pendiente
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {product.petType}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {product.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {product.description}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="text-xl font-bold text-slate-900">
                    {formatCurrency(product.price)}
                  </p>
                  <Link
                    href={`/producto/${product.slug}`}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Cómo funciona
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Tu pedido en tres pasos
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto rounded-2xl bg-emerald-700 px-6 py-10 text-center text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
            {siteConfig.name}
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight">
            Prepará el próximo pedido de tu mascota hoy
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
            Revisá productos disponibles, precios y stock para coordinar tu
            entrega local.
          </p>
          <Link
            href="/catalogo"
            className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Explorar catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}
