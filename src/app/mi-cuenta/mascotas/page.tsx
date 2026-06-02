import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  current_food: string | null;
};

function displayValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Pendiente";
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function MascotasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mi-cuenta/mascotas");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
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

  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, name, species, breed, birth_date, weight, current_food")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Pet[]>();

  if (petsError) {
    console.error("Failed to load customer pets", petsError);
  }

  const hasPets = pets && pets.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mi cuenta
          </Link>
        </div>

        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Mi cuenta
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Mis mascotas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Administra los perfiles de tus mascotas y prepara su expediente
              digital.
            </p>
          </div>
          <Link
            href="/mi-cuenta/mascotas/nueva"
            className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Agregar mascota
          </Link>
        </header>

        <section className="mt-8">
          {!hasPets ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <h2 className="text-xl font-bold tracking-tight">
                Aun no has registrado mascotas.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Agrega tu primera mascota para tener su informacion basica
                lista cuando el modulo este disponible.
              </p>
              <Link
                href="/mi-cuenta/mascotas/nueva"
                className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Agregar mascota
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/mi-cuenta/mascotas/${pet.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">
                        {displayValue(pet.species)}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {displayValue(pet.name)}
                      </h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Perfil
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                      <dt className="text-slate-500">Raza</dt>
                      <dd className="font-semibold text-slate-900">
                        {displayValue(pet.breed)}
                      </dd>
                    </div>
                    {pet.birth_date ? (
                      <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                        <dt className="text-slate-500">Nacimiento</dt>
                        <dd className="font-semibold text-slate-900">
                          {formatBirthDate(pet.birth_date)}
                        </dd>
                      </div>
                    ) : null}
                    {pet.weight !== null ? (
                      <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                        <dt className="text-slate-500">Peso</dt>
                        <dd className="font-semibold text-slate-900">
                          {pet.weight} kg
                        </dd>
                      </div>
                    ) : null}
                    {pet.current_food ? (
                      <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                        <dt className="text-slate-500">Alimento actual</dt>
                        <dd className="font-semibold text-slate-900">
                          {pet.current_food}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
