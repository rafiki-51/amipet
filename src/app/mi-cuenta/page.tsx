import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/account/SignOutButton";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

export default async function MiCuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mi-cuenta");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load customer profile role", profileError);
  }

  if (profile && adminRoles.has(profile.role as string)) {
    redirect("/admin/pedidos");
  }

  if (!profile || profile.role !== "customer") {
    redirect("/login");
  }

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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Mi cuenta
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hola, {displayValue(name)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Administra tus datos de cliente y prepara el espacio donde vas a
              poder consultar la informacion de tus mascotas.
            </p>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Datos del cliente
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nombre
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(name)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Email
                </dt>
                <dd className="mt-2 break-words text-base font-semibold text-slate-950">
                  {displayValue(email)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Telefono
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(phone)}
                </dd>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Estado de cuenta
                </dt>
                <dd className="mt-2 text-base font-semibold text-emerald-950">
                  Cuenta activa
                </dd>
              </div>
            </dl>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">Mis mascotas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Este espacio quedara listo para registrar mascotas y consultar su
              informacion principal.
            </p>
            <Link
              href="/mi-cuenta/mascotas"
              className="mt-6 inline-flex w-full justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ver mis mascotas
            </Link>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Proximamente: perfiles, citas y recordatorios por mascota.
            </p>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Expediente digital
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Base preparada para centralizar historial medico, vacunas,
                notas veterinarias y documentos de cada mascota cuando se
                implemente el modulo.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              En preparacion
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {["Historial", "Vacunas", "Citas", "Documentos"].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-900">{item}</p>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Pendiente de integrar.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
