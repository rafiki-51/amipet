import Link from "next/link";
import { redirect } from "next/navigation";

import { createPetMedication } from "@/actions/pet-medications";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el nombre, tipo y fecha de inicio.",
  type: "Seleccioná un tipo de medicamento válido.",
  date: "Ingresá una fecha de inicio válida.",
  "end-date": "Ingresá una fecha de finalización válida.",
  status: "No pudimos validar el estado del medicamento.",
  archived: "Esta mascota está archivada y no permite nuevos medicamentos.",
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
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/medicamentos/nuevo`,
    profileErrorLogMessage: "Failed to load profile for medication creation",
  });

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
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="mb-6 min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Volver a medicamentos
          </Link>
        </div>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Agregar medicamento
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Registrá un medicamento o tratamiento para{" "}
                {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark sm:self-start [overflow-wrap:anywhere]">
              {displayValue(pet.species)}
            </span>
          </div>

          <p className="mt-6 rounded-xl bg-brand-light/50 px-4 py-3 text-sm text-slate-600 [overflow-wrap:anywhere]">
            Guardá dosis, frecuencia y fechas del tratamiento. No se crean
            recordatorios automáticos en esta fase.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={createPetMedicationWithPet} className="mt-8 grid gap-5 min-w-0">
            <input type="hidden" name="status" value="active" />

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Nombre del medicamento
              </span>
              <input
                type="text"
                name="medication_name"
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Tipo
                </span>
                <select
                  name="medication_type"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                >
                  <option value="" disabled>
                    Seleccioná un tipo
                  </option>
                  {medicationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Dosis
                </span>
                <input
                  type="text"
                  name="dosage"
                  placeholder="Ej. 1 tableta, 2 ml"
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Frecuencia
                </span>
                <input
                  type="text"
                  name="frequency"
                  placeholder="Ej. Cada 12 horas"
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Vía de administración
                </span>
                <input
                  type="text"
                  name="route"
                  placeholder="Ej. Oral, topica"
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Fecha de inicio
                </span>
                <input
                  type="date"
                  name="start_date"
                  defaultValue={getTodayInputValue()}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Fecha de finalización
                </span>
                <input
                  type="date"
                  name="end_date"
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Prescrito por
              </span>
              <input
                type="text"
                name="prescribed_by"
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end min-w-0">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
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
