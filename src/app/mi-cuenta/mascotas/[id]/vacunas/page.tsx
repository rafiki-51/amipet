import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type Vaccination = {
  id: string;
  vaccine_name: string;
  administered_at: string;
  next_due_at: string | null;
  clinic_name: string | null;
  veterinarian_name: string | null;
  batch_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type VacunasPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delete: "No pudimos eliminar la vacuna. Intentalo nuevamente.",
  archived: "Esta mascota esta archivada y solo permite consulta.",
};

const statusLabels: Record<string, string> = {
  applied: "Aplicada",
  scheduled: "Programada",
  skipped: "Omitida",
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Pendiente";
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatStatus(value: string) {
  return statusLabels[value] || "No indicado";
}

export default async function VacunasPage({
  params,
  searchParams,
}: VacunasPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mi-cuenta/mascotas/${id}/vacunas`);
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
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet vaccinations", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: vaccinationData, error: vaccinationsError } = await supabase
    .from("pet_vaccinations")
    .select(
      "id, vaccine_name, administered_at, next_due_at, clinic_name, veterinarian_name, batch_number, notes, status, created_at, updated_at",
    )
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("administered_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Vaccination[]>();

  if (vaccinationsError) {
    console.error("Failed to load customer pet vaccination records", vaccinationsError);
  }

  const vaccinations = vaccinationsError ? [] : vaccinationData || [];
  const latestVaccination = vaccinations[0];
  const isArchived = Boolean(pet.archived_at);
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a la mascota
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Expediente digital
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Vacunas
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota esta archivada. Las vacunas quedan disponibles
                  solo para consulta.
                </p>
              ) : null}
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
                <Link
                  href={`/mi-cuenta/mascotas/${pet.id}/vacunas/nueva`}
                  className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Agregar vacuna
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ultima vacuna
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {latestVaccination
                ? displayValue(latestVaccination.vaccine_name)
                : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ultima aplicacion
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {latestVaccination
                ? formatDate(latestVaccination.administered_at)
                : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {vaccinations.length}
            </p>
          </div>
        </section>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Registros</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Vacunas registradas para el expediente digital de esta mascota.
              </p>
            </div>
          </div>

          {vaccinations.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <h3 className="text-lg font-bold tracking-tight">
                Aun no hay vacunas registradas.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                {isArchived
                  ? "No hay vacunas registradas para consultar."
                  : "Cuando agregues vacunas, apareceran aqui ordenadas desde la mas reciente."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {vaccinations.map((vaccination) => (
                <article
                  key={vaccination.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-bold tracking-tight text-slate-950">
                        {displayValue(vaccination.vaccine_name)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Aplicada: {formatDate(vaccination.administered_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {formatStatus(vaccination.status)}
                      </span>
                      <p className="text-sm leading-6 text-slate-500">
                        Creada: {formatDate(vaccination.created_at)}
                      </p>
                      {!isArchived ? (
                        <Link
                          href={`/mi-cuenta/mascotas/${pet.id}/vacunas/${vaccination.id}/editar`}
                          className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Proxima dosis
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-slate-950">
                        {formatDate(vaccination.next_due_at)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Clinica
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-slate-950">
                        {displayValue(vaccination.clinic_name)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Veterinaria
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-slate-950">
                        {displayValue(vaccination.veterinarian_name)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Lote
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-slate-950">
                        {displayValue(vaccination.batch_number)}
                      </dd>
                    </div>
                  </dl>

                  {vaccination.notes ? (
                    <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                      {vaccination.notes}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
