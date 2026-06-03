import Link from "next/link";
import { redirect } from "next/navigation";
import {
  completePetMedication,
  deletePetMedication,
  pausePetMedication,
  reopenPetMedication,
  updatePetMedication,
} from "@/actions/pet-medications";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el nombre, tipo y fecha de inicio.",
  type: "Selecciona un tipo de medicamento valido.",
  date: "Ingresa una fecha de inicio valida.",
  "end-date": "Ingresa una fecha de finalizacion valida.",
  status: "No pudimos validar el estado del medicamento.",
  archived: "Esta mascota esta archivada y no permite editar medicamentos.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type Medication = {
  id: string;
  medication_name: string;
  medication_type: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  prescribed_by: string | null;
  notes: string | null;
};

type EditMedicationPageProps = {
  params: Promise<{
    id: string;
    medicationId: string;
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

function inputValue(value: string | null) {
  return value ?? "";
}

export default async function EditMedicationPage({
  params,
  searchParams,
}: EditMedicationPageProps) {
  const { id, medicationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/mi-cuenta/mascotas/${id}/medicamentos/${medicationId}/editar`,
    );
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
    console.error("Failed to load customer pet for medication editing", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/medicamentos`);
  }

  const { data: medication, error: medicationError } = await supabase
    .from("pet_medications")
    .select(
      "id, medication_name, medication_type, dosage, frequency, route, start_date, end_date, status, prescribed_by, notes",
    )
    .eq("id", medicationId)
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .maybeSingle<Medication>();

  if (medicationError) {
    console.error(
      "Failed to load customer pet medication for editing",
      medicationError,
    );
  }

  if (!medication || medicationError) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/medicamentos`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updateMedicationWithIds = updatePetMedication.bind(
    null,
    pet.id,
    medication.id,
  );
  const deleteMedicationWithIds = deletePetMedication.bind(
    null,
    pet.id,
    medication.id,
  );
  const completeMedicationWithIds = completePetMedication.bind(
    null,
    pet.id,
    medication.id,
  );
  const pauseMedicationWithIds = pausePetMedication.bind(
    null,
    pet.id,
    medication.id,
  );
  const reopenMedicationWithIds = reopenPetMedication.bind(
    null,
    pet.id,
    medication.id,
  );

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
                Editar medicamento
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Actualiza el medicamento o tratamiento de{" "}
                {displayValue(pet.name)}.
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

          <form action={updateMedicationWithIds} className="mt-8 grid gap-5">
            <input type="hidden" name="status" value={medication.status} />

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Nombre del medicamento
              </span>
              <input
                type="text"
                name="medication_name"
                defaultValue={medication.medication_name}
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
                  defaultValue={medication.medication_type}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
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
                  defaultValue={inputValue(medication.dosage)}
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
                  defaultValue={inputValue(medication.frequency)}
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
                  defaultValue={inputValue(medication.route)}
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
                  defaultValue={medication.start_date}
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
                  defaultValue={inputValue(medication.end_date)}
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
                defaultValue={inputValue(medication.prescribed_by)}
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
                defaultValue={inputValue(medication.notes)}
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
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        {medication.status !== "canceled" ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold tracking-tight">Acciones</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cambia el estado del tratamiento sin modificar las fechas.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {medication.status === "active" ? (
                <>
                  <form action={completeMedicationWithIds}>
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Marcar como completado
                    </button>
                  </form>
                  <form action={pauseMedicationWithIds}>
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      Pausar tratamiento
                    </button>
                  </form>
                </>
              ) : null}
              {medication.status === "paused" ||
              medication.status === "completed" ? (
                <form action={reopenMedicationWithIds}>
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Reabrir tratamiento
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-red-800">
            Eliminar medicamento
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Esta accion elimina permanentemente este registro del expediente.
          </p>
          <form action={deleteMedicationWithIds} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              Eliminar medicamento
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
