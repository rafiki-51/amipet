import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deletePetWeightLog,
  updatePetWeightLog,
} from "@/actions/pet-weight-logs";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el peso y la fecha de medicion.",
  weight: "Ingresa un peso valido.",
  date: "Ingresa una fecha de medicion valida.",
  "future-date": "La fecha de medicion no puede estar en el futuro.",
  archived: "Esta mascota esta archivada y no permite editar registros.",
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mi-cuenta/mascotas/${id}/peso/${logId}/editar`);
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/peso`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver al historial de peso
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Historial de peso
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Editar registro de peso
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Actualiza la medicion registrada para {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 sm:self-start">
              {displayValue(pet.species)}
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <form action={updatePetWeightLogWithIds} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Peso en kg
                </span>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.01"
                  defaultValue={inputValue(log.weight)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="kg"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Fecha de medicion
                </span>
                <input
                  type="date"
                  name="measured_at"
                  defaultValue={log.measured_at}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={inputValue(log.notes)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/peso`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-red-800">
            Eliminar registro
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Esta accion elimina permanentemente este registro del historial de
            peso.
          </p>
          <form action={deletePetWeightLogWithIds} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              Eliminar registro
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
