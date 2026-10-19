import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

type Pet = {
  id: string;
  name: string;
  species: string;
  weight: number | null;
  archived_at: string | null;
};

type WeightLog = {
  id: string;
  weight: number | string;
  measured_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PesoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delete: "No pudimos eliminar el registro de peso. Intentalo nuevamente.",
  archived: "Esta mascota está archivada y solo permite consulta.",
};

function displayValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Pendiente";
}

function formatWeight(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return `${value} kg`;
  }

  return value?.trim() ? `${value} kg` : "Pendiente";
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

export default async function PesoPage({ params, searchParams }: PesoPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/peso`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, weight, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet weight history", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: logs, error: logsError } = await supabase
    .from("pet_weight_logs")
    .select("id, weight, measured_at, notes, created_at, updated_at")
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<WeightLog[]>();

  if (logsError) {
    console.error("Failed to load customer pet weight logs", logsError);
  }

  const weightLogs = logsError ? [] : logs || [];
  const latestLog = weightLogs[0];
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
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a la mascota
          </Link>
        </div>

        <header className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Historial de peso
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere] sm:text-4xl">
                Historial de peso
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota está archivada. El historial queda disponible
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
                  href={`/mi-cuenta/mascotas/${pet.id}/peso/nuevo`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar registro
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid min-w-0 gap-5 sm:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Último peso
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestLog ? formatWeight(latestLog.weight) : "Pendiente"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Última medición
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestLog ? formatDate(latestLog.measured_at) : "Pendiente"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {weightLogs.length}
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
                Mediciones guardadas para el seguimiento de peso de esta
                mascota.
              </p>
            </div>
          </div>

          {weightLogs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-dark/20 bg-brand-light/50 px-4 py-10 sm:px-6 text-center">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark">
                Aún no hay registros de peso.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Cuando agregues mediciones, aparecerán aquí ordenadas desde la
                más reciente.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {weightLogs.map((log) => (
                <article
                  key={log.id}
                  className="min-w-0 rounded-xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-lg font-bold tracking-tight text-brand-dark">
                        {formatWeight(log.weight)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
                        {formatDate(log.measured_at)}
                      </p>
                    </div>
                    <div className="min-w-0 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] sm:text-right">
                      <p>Creado: {formatDate(log.created_at)}</p>
                      <p>Actualizado: {formatDate(log.updated_at)}</p>
                      {!isArchived ? (
                        <Link
                          href={`/mi-cuenta/mascotas/${pet.id}/peso/${log.id}/editar`}
                          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-dark/20 px-4 py-2 font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {log.notes ? (
                    <p className="mt-4 rounded-xl bg-brand-light/60 p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                      {log.notes}
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
