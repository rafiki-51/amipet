import Link from "next/link";
import { redirect } from "next/navigation";

import { createPetMedicalRecord } from "@/actions/pet-medical-records";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el tipo, titulo y fecha del evento.",
  type: "Selecciona un tipo de evento valido.",
  date: "Ingresa una fecha valida.",
  "future-date": "La fecha del evento no puede estar en el futuro.",
  archived: "Esta mascota esta archivada y no permite nuevos eventos medicos.",
  save: "No pudimos guardar el evento. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type NewMedicalRecordPageProps = {
  params: Promise<{
    id: string;
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

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewMedicalRecordPage({
  params,
  searchParams,
}: NewMedicalRecordPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=/mi-cuenta/mascotas/${id}/historial-medico/nuevo`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Failed to load profile for medical record creation",
      profileError,
    );
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
    console.error("Failed to load pet for medical record creation", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/historial-medico`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const createPetMedicalRecordWithPet = createPetMedicalRecord.bind(
    null,
    pet.id,
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
                Agregar evento medico
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Registra una consulta, diagnostico, procedimiento o nota medica
                para {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 sm:self-start">
              {displayValue(pet.species)}
            </span>
          </div>

          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Este registro no crea recordatorios, relaciones ni adjuntos
            automaticamente.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <form
            action={createPetMedicalRecordWithPet}
            className="mt-8 grid gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Tipo de evento
                </span>
                <select
                  name="record_type"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
                  <option value="" disabled>
                    Selecciona un tipo
                  </option>
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
                  defaultValue={getTodayInputValue()}
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
                Guardar evento
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
