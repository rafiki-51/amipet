import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deletePetWeightLog,
  updatePetWeightLog,
} from "@/actions/pet-weight-logs";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el peso y la fecha de medición.",
  weight: "Ingresá un peso válido.",
  date: "Ingresá una fecha de medición válida.",
  "future-date": "La fecha de medición no puede estar en el futuro.",
  archived: "Esta mascota está archivada y no permite editar registros.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type WeightLog = {
  id: string;
  weight: number | string;
  measured_at: string;
  notes: string | null;
};

type EditarPesoPageProps = {
  params: Promise<{
    id: string;
    logId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function inputValue(value: string | number | null) {
  return value ?? "";
}

export default async function EditarPesoPage({
  params,
  searchParams,
}: EditarPesoPageProps) {
  const { id, logId } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/peso/${logId}/editar`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet for weight log editing", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/peso`);
  }

  const { data: log, error: logError } = await supabase
    .from("pet_weight_logs")
    .select("id, weight, measured_at, notes")
    .eq("id", logId)
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .maybeSingle<WeightLog>();

  if (logError) {
    console.error("Failed to load customer pet weight log for editing", logError);
  }

  if (!log || logError) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/peso`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updatePetWeightLogWithIds = updatePetWeightLog.bind(
    null,
    pet.id,
    log.id,
  );
  const deletePetWeightLogWithIds = deletePetWeightLog.bind(
    null,
    pet.id,
    log.id,
  );

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/peso`}
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver al historial de peso
          </Link>
        </div>

        <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Historial de peso
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Editar registro de peso
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Actualizá la medición registrada para {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex max-w-full rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere] sm:self-start">
              {displayValue(pet.species)}
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={updatePetWeightLogWithIds} className="mt-8 grid min-w-0 gap-6">
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Peso en kg
                </span>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.01"
                  defaultValue={inputValue(log.weight)}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  placeholder="kg"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Fecha de medición
                </span>
                <input
                  type="date"
                  name="measured_at"
                  defaultValue={log.measured_at}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  required
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={inputValue(log.notes)}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-dark/10 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/peso`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="mt-5 min-w-0 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-red-800">
            Eliminar registro
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            Esta acción elimina permanentemente este registro del historial de
            peso.
          </p>
          <form action={deletePetWeightLogWithIds} className="mt-6">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            >
              Eliminar registro
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
