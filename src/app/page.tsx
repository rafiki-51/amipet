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
    <main className="min-h-screen bg-white text-slate-900 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-brand-purple">
      <section className="bg-brand-light px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12 lg:items-center">
          <div>
            <div className="mb-5 w-full max-w-[280px] sm:max-w-[360px]">
              <Image
                src="/images/rafapet-logo-horizontal-web.png"
                alt="RafaPet"
                width={2048}
                height={665}
                priority
                sizes="(max-width: 640px) 280px, 360px"
                className="h-auto w-full"
              />
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
              {siteConfig.delivery.label}
            </p>

            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
              Alimento y cuidado para quienes son parte de tu familia
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              En RafaPet cuidamos a quienes forman parte de tu familia. Comenzamos
              con alimentos para perros y gatos, con entrega local en el este de
              San José, y seguimos creciendo para acompañar a más mascotas.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/catalogo"
                className="rounded-xl bg-brand-dark px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
              >
                Explorar catálogo
              </Link>
              <a
                href="#zonas"
                className="rounded-xl border border-brand-dark/20 bg-white px-6 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
              >
                Ver zonas de entrega
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-brand-yellow/15 p-4">
              <p className="text-sm font-semibold text-brand-dark">
                Selección recomendada
              </p>
              <p className="mt-1 text-xs text-brand-dark">
                Una selección para empezar
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="break-words font-semibold text-brand-dark">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.weight} · Stock {product.stock}
                    </p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-sm font-bold text-brand-dark">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-brand-dark px-4 py-3 text-sm font-semibold text-white">
              Entrega gratis en zonas seleccionadas
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">Compra rápida</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Elegí productos disponibles y armá tu pedido en pocos pasos.
            </p>
          </div>
          <div className="rounded-xl border border-brand-dark/10 bg-brand-light p-5">
            <p className="font-semibold text-brand-dark">Entrega local</p>
            <p className="mt-2 text-sm leading-6 text-brand-dark">
              {siteConfig.delivery.label} dentro de nuestra zona de cobertura.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">Cuidado responsable</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Productos y procesos pensados para el bienestar cotidiano de tus
              mascotas.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-900">Atención cercana</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Una tienda local para familias con mascotas en el este de San
              José.
            </p>
          </div>
        </div>
      </section>

      <section id="zonas" className="bg-slate-50 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Cobertura
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
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

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Lo que encontrás hoy
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
                Lo básico para perros y gatos
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                RafaPet acompaña a familias con todo tipo de mascotas. Hoy, nuestro
                catálogo se concentra en perros y gatos.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-brand-dark hover:text-brand-purple"
            >
              Ver todo el catálogo
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.title}
                href="/catalogo"
                className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-dark/20 hover:bg-brand-light"
              >
                <div aria-hidden="true" className="mb-4 h-12 w-12 rounded-full border-4 border-brand-green/30 bg-brand-purple/10" />
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

      <section className="bg-slate-50 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Productos disponibles hoy
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
                Alimento para perros y gatos
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Una selección inicial de alimento para perros y gatos.
              </p>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-brand-dark hover:text-brand-purple"
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
                <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm font-medium text-slate-600">
                  Imagen no disponible
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark">
                  {product.petType}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {product.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {product.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
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

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Cómo funciona
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark">
            Tu pedido en tres pasos
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-white">
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

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto rounded-2xl bg-brand-dark px-6 py-10 text-center text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-light">
            {siteConfig.name}
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white">
            Prepará el próximo pedido de tu mascota con RafaPet
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-brand-light sm:text-base">
            Revisá productos disponibles, precios y stock para coordinar tu
            entrega local.
          </p>
          <Link
            href="/catalogo"
            className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
          >
            Explorar catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}
