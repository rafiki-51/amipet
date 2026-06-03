import Link from "next/link";
import { redirect } from "next/navigation";

import { createPetMedication } from "@/actions/pet-medications";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el nombre, tipo y fecha de inicio.",
  type: "Selecciona un tipo de medicamento valido.",
  date: "Ingresa una fecha de inicio valida.",
  "end-date": "Ingresa una fecha de finalizacion valida.",
  status: "No pudimos validar el estado del medicamento.",
  archived: "Esta mascota esta archivada y no permite nuevos medicamentos.",
  save: "No pudimos guardar el medicamento. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type NewMedicationPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const medicationTypeOptions = [
  { value: "medication", label: "Medicamento" },
  { value: "supplement", label: "Suplemento" },
  { value: "antiparasitic", label: "Antiparasitario" },
  { value: "vitamin", label: "Vitamina" },
  { value: "dermatological", label: "Dermatologico" },
  { value: "other", label: "Otro" },
];

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewMedicationPage({
  params,
  searchParams,
}: NewMedicationPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mi-cuenta/mascotas/${id}/medicamentos/nuevo`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile for medication creation", profileError);
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
    console.error("Failed to load pet for medication creation", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/medicamentos`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const createPetMedicationWithPet = createPetMedication.bind(null, pet.id);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a medicamentos
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Agregar medicamento
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Registra un medicamento o tratamiento para{" "}
                {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 sm:self-start">
              {displayValue(pet.species)}
            </span>
          </div>

          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Guarda dosis, frecuencia y fechas del tratamiento. No se crean
            recordatorios automaticos en esta fase.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <form action={createPetMedicationWithPet} className="mt-8 grid gap-5">
            <input type="hidden" name="status" value="active" />

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Nombre del medicamento
              </span>
              <input
                type="text"
                name="medication_name"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Tipo
                </span>
                <select
                  name="medication_type"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
                  <option value="" disabled>
                    Selecciona un tipo
                  </option>
                  {medicationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Dosis
                </span>
                <input
                  type="text"
                  name="dosage"
                  placeholder="Ej. 1 tableta, 2 ml"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Frecuencia
                </span>
                <input
                  type="text"
                  name="frequency"
                  placeholder="Ej. Cada 12 horas"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Via de administracion
                </span>
                <input
                  type="text"
                  name="route"
                  placeholder="Ej. Oral, topica"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Fecha de inicio
                </span>
                <input
                  type="date"
                  name="start_date"
                  defaultValue={getTodayInputValue()}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Fecha de finalizacion
                </span>
                <input
                  type="date"
                  name="end_date"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Prescrito por
              </span>
              <input
                type="text"
                name="prescribed_by"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Guardar medicamento
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
