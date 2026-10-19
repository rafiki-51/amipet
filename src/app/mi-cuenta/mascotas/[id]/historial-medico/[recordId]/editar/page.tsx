import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deletePetMedicalRecord,
  updatePetMedicalRecord,
} from "@/actions/pet-medical-records";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el tipo, título y fecha del evento.",
  type: "Seleccioná un tipo de evento válido.",
  date: "Ingresá una fecha válida.",
  "future-date": "La fecha del evento no puede estar en el futuro.",
  archived: "Esta mascota está archivada y no permite editar eventos médicos.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type MedicalRecord = {
  id: string;
  record_type: string;
  title: string;
  occurred_at: string;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  clinic_name: string | null;
  veterinarian_name: string | null;
  notes: string | null;
};

type EditMedicalRecordPageProps = {
  params: Promise<{
    id: string;
    recordId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const recordTypeOptions = [
  { value: "consultation", label: "Consultá" },
  { value: "symptom", label: "Sintoma" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "treatment", label: "Tratamiento" },
  { value: "procedure", label: "Procedimiento" },
  { value: "surgery", label: "Cirugia" },
  { value: "emergency", label: "Emergencia" },
  { value: "exam_result", label: "Resultado de examen" },
  { value: "follow_up", label: "Control" },
  { value: "note", label: "Nota" },
  { value: "other", label: "Otro" },
];

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function inputValue(value: string | null) {
  return value ?? "";
}

export default async function EditMedicalRecordPage({
  params,
  searchParams,
}: EditMedicalRecordPageProps) {
  const { id, recordId } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/historial-medico/${recordId}/editar`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error(
      "Failed to load customer pet for medical record editing",
      petError,
    );
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/historial-medico`);
  }

  const { data: record, error: recordError } = await supabase
    .from("pet_medical_records")
    .select(
      "id, record_type, title, occurred_at, symptoms, diagnosis, treatment, clinic_name, veterinarian_name, notes",
    )
    .eq("id", recordId)
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .maybeSingle<MedicalRecord>();

  if (recordError) {
    console.error(
      "Failed to load customer pet medical record for editing",
      recordError,
    );
  }

  if (!record || recordError) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/historial-medico`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updateMedicalRecordWithIds = updatePetMedicalRecord.bind(
    null,
    pet.id,
    record.id,
  );
  const deleteMedicalRecordWithIds = deletePetMedicalRecord.bind(
    null,
    pet.id,
    record.id,
  );

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="mb-6 min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/historial-medico`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Volver a historial médico
          </Link>
        </div>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Editar evento médico
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Actualizá este evento médico de {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark sm:self-start [overflow-wrap:anywhere]">
              {displayValue(pet.species)}
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={updateMedicalRecordWithIds} className="mt-8 grid gap-5 min-w-0">
            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Tipo de evento
                </span>
                <select
                  name="record_type"
                  defaultValue={record.record_type}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                >
                  {recordTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Fecha del evento
                </span>
                <input
                  type="date"
                  name="occurred_at"
                  defaultValue={record.occurred_at}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Título
              </span>
              <input
                type="text"
                name="title"
                defaultValue={record.title}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Clínica
                </span>
                <input
                  type="text"
                  name="clinic_name"
                  defaultValue={inputValue(record.clinic_name)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Veterinario
                </span>
                <input
                  type="text"
                  name="veterinarian_name"
                  defaultValue={inputValue(record.veterinarian_name)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Síntomas
              </span>
              <textarea
                name="symptoms"
                rows={3}
                defaultValue={inputValue(record.symptoms)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Diagnóstico
              </span>
              <textarea
                name="diagnosis"
                rows={3}
                defaultValue={inputValue(record.diagnosis)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Tratamiento
              </span>
              <textarea
                name="treatment"
                rows={3}
                defaultValue={inputValue(record.treatment)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={inputValue(record.notes)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end min-w-0">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/historial-medico`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        <section className="mt-5 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-red-800 [overflow-wrap:anywhere]">
            Eliminar evento médico
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            Esta acción elimina permanentemente este registro del expediente.
          </p>
          <form action={deleteMedicalRecordWithIds} className="mt-6 min-w-0">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            >
              Eliminar evento médico
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
