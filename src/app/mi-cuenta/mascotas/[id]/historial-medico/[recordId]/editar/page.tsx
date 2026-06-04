import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deletePetMedicalRecord,
  updatePetMedicalRecord,
} from "@/actions/pet-medical-records";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el tipo, titulo y fecha del evento.",
  type: "Selecciona un tipo de evento valido.",
  date: "Ingresa una fecha valida.",
  "future-date": "La fecha del evento no puede estar en el futuro.",
  archived: "Esta mascota esta archivada y no permite editar eventos medicos.",
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
  { value: "consultation", label: "Consulta" },
  { value: "symptom", label: "Sintoma" },
  { value: "diagnosis", label: "Diagnostico" },
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/mi-cuenta/mascotas/${id}/historial-medico/${recordId}/editar`,
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/historial-medico`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a historial medico
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Editar evento medico
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Actualiza este evento medico de {displayValue(pet.name)}.
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

          <form action={updateMedicalRecordWithIds} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Tipo de evento
                </span>
                <select
                  name="record_type"
                  defaultValue={record.record_type}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
                  {recordTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Fecha del evento
                </span>
                <input
                  type="date"
                  name="occurred_at"
                  defaultValue={record.occurred_at}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Titulo
              </span>
              <input
                type="text"
                name="title"
                defaultValue={record.title}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Clinica
                </span>
                <input
                  type="text"
                  name="clinic_name"
                  defaultValue={inputValue(record.clinic_name)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Veterinario
                </span>
                <input
                  type="text"
                  name="veterinarian_name"
                  defaultValue={inputValue(record.veterinarian_name)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Sintomas
              </span>
              <textarea
                name="symptoms"
                rows={3}
                defaultValue={inputValue(record.symptoms)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Diagnostico
              </span>
              <textarea
                name="diagnosis"
                rows={3}
                defaultValue={inputValue(record.diagnosis)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Tratamiento
              </span>
              <textarea
                name="treatment"
                rows={3}
                defaultValue={inputValue(record.treatment)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={inputValue(record.notes)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/historial-medico`}
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
            Eliminar evento medico
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Esta accion elimina permanentemente este registro del expediente.
          </p>
          <form action={deleteMedicalRecordWithIds} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              Eliminar evento medico
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
