import Link from "next/link";
import { SignOutButton } from "@/components/account/SignOutButton";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

export default async function MiCuentaPage() {
  const { supabase, user, profile } = await requireCustomerPageUser({
    redirectPath: "/mi-cuenta",
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: customerProfile, error: customerProfileError } = await supabase
    .from("customer_profiles")
    .select("full_name, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerProfileError) {
    console.error("Failed to load customer account profile", customerProfileError);
  }

  const email = profile.email || user.email || "";
  const name =
    customerProfile?.full_name ||
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "");
  const phone =
    customerProfile?.phone ||
    (typeof user.user_metadata.phone === "string"
      ? user.user_metadata.phone
      : "");

  return (
    <main className="min-h-screen bg-brand-light px-4 py-10 text-slate-900 sm:px-6 sm:py-12 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-brand-purple">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">
              Mi cuenta
            </p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Hola, {displayValue(name)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Consultá tus datos, tus pedidos y el expediente digital de tus mascotas.
            </p>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              Datos del cliente
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nombre
                </dt>
                <dd className="mt-2 break-words text-base font-semibold text-brand-dark">
                  {displayValue(name)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Email
                </dt>
                <dd className="mt-2 break-words text-base font-semibold text-brand-dark">
                  {displayValue(email)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Teléfono
                </dt>
                <dd className="mt-2 break-words text-base font-semibold text-brand-dark">
                  {displayValue(phone)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-purple/15 bg-brand-purple/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-purple">
                  Estado de cuenta
                </dt>
                <dd className="mt-2 break-words text-base font-semibold text-brand-dark">
                  Mi información
                </dd>
              </div>
            </dl>
          </article>

          <div className="grid gap-5">
            <aside className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Mis pedidos</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Consulta el estado y detalle de los pedidos vinculados a tu
                cuenta.
              </p>
              <Link
                href="/mi-cuenta/pedidos"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark/90"
              >
                Ir a mis pedidos
              </Link>
            </aside>

            <aside className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Mis mascotas</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Consulta y administra los perfiles de tus mascotas desde un
                solo lugar.
              </p>
              <Link
                href="/mi-cuenta/mascotas"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light"
              >
                Ir a mis mascotas
              </Link>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Cada mascota tiene su propio expediente digital para seguimiento
                de salud y cuidado.
              </p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
