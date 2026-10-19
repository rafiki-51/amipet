import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

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
  archived: "Esta mascota está archivada y solo permite consulta.",
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
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/vacunas`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

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
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto min-w-0 max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}`}
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a la mascota
          </Link>
        </div>

        <header className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Expediente digital
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere] sm:text-4xl">
                Vacunas
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota está archivada. Las vacunas quedan disponibles
                  solo para consulta.
                </p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex max-w-full rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
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
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar vacuna
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid min-w-0 gap-5 sm:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Última vacuna
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestVaccination
                ? displayValue(latestVaccination.vaccine_name)
                : "Pendiente"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Última aplicación
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestVaccination
                ? formatDate(latestVaccination.administered_at)
                : "Pendiente"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {vaccinations.length}
            </p>
          </div>
        </section>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 [overflow-wrap:anywhere]">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-5 min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">Registros</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Vacunas registradas para el expediente digital de esta mascota.
              </p>
            </div>
          </div>

          {vaccinations.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-dark/20 bg-brand-light/50 px-4 py-10 sm:px-6 text-center">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark">
                Aún no hay vacunas registradas.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                {isArchived
                  ? "No hay vacunas registradas para consultar."
                  : "Cuando agregues vacunas, aparecerán aquí ordenadas desde la más reciente."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid min-w-0 gap-4">
              {vaccinations.map((vaccination) => (
                <article
                  key={vaccination.id}
                  className="min-w-0 rounded-xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(vaccination.vaccine_name)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
                        Aplicada: {formatDate(vaccination.administered_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {formatStatus(vaccination.status)}
                      </span>
                      <p className="text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                        Creada: {formatDate(vaccination.created_at)}
                      </p>
                      {!isArchived ? (
                        <Link
                          href={`/mi-cuenta/mascotas/${pet.id}/vacunas/${vaccination.id}/editar`}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-dark/20 px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0 rounded-xl bg-brand-light/50 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Próxima dosis
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                        {formatDate(vaccination.next_due_at)}
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-xl bg-brand-light/50 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Clínica
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(vaccination.clinic_name)}
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-xl bg-brand-light/50 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Veterinario
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(vaccination.veterinarian_name)}
                      </dd>
                    </div>
                    <div className="min-w-0 rounded-xl bg-brand-light/50 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Lote
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(vaccination.batch_number)}
                      </dd>
                    </div>
                  </dl>

                  {vaccination.notes ? (
                    <p className="mt-4 min-w-0 rounded-xl bg-brand-light/50 p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
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
