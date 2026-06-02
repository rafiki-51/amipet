import Link from "next/link";
import { redirect } from "next/navigation";
import { archivePet } from "@/actions/pets";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

type Pet = {
  id: string;
  name: string;
  species: string;
  sex: string | null;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  allergies: string | null;
  current_food: string | null;
  care_notes: string | null;
  archived_at: string | null;
};

type MascotaDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const sexLabels: Record<string, string> = {
  male: "Macho",
  female: "Hembra",
  unknown: "No indicado",
};

function displayValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Pendiente";
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatSex(value: string | null) {
  if (!value) {
    return "No indicado";
  }

  return sexLabels[value] || "No indicado";
}

export default async function MascotaDetallePage({
  params,
}: MascotaDetallePageProps) {
  const { id } = await params;
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

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select(
      "id, name, species, sex, breed, birth_date, weight, allergies, current_food, care_notes, archived_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet detail", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const archivePetWithId = archivePet.bind(null, pet.id);
  const isArchived = Boolean(pet.archived_at);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/mascotas"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mis mascotas
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Perfil de mascota
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {displayValue(pet.name)}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Informacion general y base para el expediente digital de esta
                mascota.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  {displayValue(pet.species)}
                </span>
                {isArchived ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    Archivada
                  </span>
                ) : null}
              </div>
              {!isArchived ? (
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link
                    href={`/mi-cuenta/mascotas/${pet.id}/editar`}
                    className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Editar mascota
                  </Link>
                  <form action={archivePetWithId}>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    >
                      Archivar mascota
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Datos principales
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nombre
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.name)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Especie
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.species)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Sexo
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {formatSex(pet.sex)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Raza
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.breed)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Fecha nacimiento
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {formatBirthDate(pet.birth_date)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Peso
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {pet.weight !== null ? `${pet.weight} kg` : "Pendiente"}
                </dd>
              </div>
            </dl>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Cuidado diario
            </h2>
            <dl className="mt-6 grid gap-4">
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Alergias
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.allergies)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Alimento actual
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.current_food)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Notas de cuidado
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.care_notes)}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Expediente digital
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Este expediente pertenecera a esta mascota y reunira su
                informacion veterinaria cuando los modulos esten disponibles.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              Proximamente
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Vacunas",
              "Historial medico",
              "Medicamentos",
              "Documentos",
              "Recordatorios",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-900">{item}</p>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Proximamente
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
