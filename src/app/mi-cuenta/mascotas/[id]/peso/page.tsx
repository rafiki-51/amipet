import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

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

export default async function PesoPage({ params }: PesoPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mi-cuenta/mascotas/${id}/peso`);
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
            Historial de peso
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Historial de peso
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota esta archivada. El historial queda disponible
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
                  href={`/mi-cuenta/mascotas/${pet.id}/peso/nuevo`}
                  className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Agregar registro
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ultimo peso
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {latestLog ? formatWeight(latestLog.weight) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ultima medicion
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {latestLog ? formatDate(latestLog.measured_at) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {weightLogs.length}
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Registros</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Mediciones guardadas para el seguimiento de peso de esta
                mascota.
              </p>
            </div>
          </div>

          {weightLogs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <h3 className="text-lg font-bold tracking-tight">
                Aun no hay registros de peso.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Cuando agregues mediciones, apareceran aqui ordenadas desde la
                mas reciente.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {weightLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-bold tracking-tight text-slate-950">
                        {formatWeight(log.weight)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatDate(log.measured_at)}
                      </p>
                    </div>
                    <div className="text-sm leading-6 text-slate-500 sm:text-right">
                      <p>Creado: {formatDate(log.created_at)}</p>
                      <p>Actualizado: {formatDate(log.updated_at)}</p>
                      {!isArchived ? (
                        <Link
                          href={`/mi-cuenta/mascotas/${pet.id}/peso/${log.id}/editar`}
                          className="mt-2 inline-flex font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {log.notes ? (
                    <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
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
