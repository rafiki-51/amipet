import Link from "next/link";
import { redirect } from "next/navigation";

import { createPetReminder } from "@/actions/pet-reminders";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el título, tipo y fecha del recordatorio.",
  type: "Seleccioná un tipo de recordatorio válido.",
  date: "Ingresá una fecha válida.",
  status: "No pudimos validar el estado del recordatorio.",
  source: "No pudimos validar el origen del recordatorio.",
  vaccination: "No pudimos validar la vacuna relacionada.",
  archived: "Esta mascota está archivada y no permite nuevos recordatorios.",
  save: "No pudimos guardar el recordatorio. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type NewReminderPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewReminderPage({
  params,
  searchParams,
}: NewReminderPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/recordatorios/nuevo`,
    profileErrorLogMessage: "Failed to load profile for reminder creation",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load pet for reminder creation", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/recordatorios`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const createPetReminderWithPet = createPetReminder.bind(null, pet.id);

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl min-w-0">
        <Link
          href={`/mi-cuenta/mascotas/${pet.id}/recordatorios`}
          className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
        >
          Volver a recordatorios
        </Link>

        <section className="mt-6 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold text-brand-dark [overflow-wrap:anywhere]">
                Agregar recordatorio
              </h1>
              <p className="mt-2 text-base text-slate-600 [overflow-wrap:anywhere]">
                {pet.name}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 sm:self-start [overflow-wrap:anywhere]">
              {pet.species}
            </span>
          </div>

          <p className="mt-6 rounded-xl bg-brand-light/50 px-4 py-3 text-sm text-slate-600 [overflow-wrap:anywhere]">
            Guardá tareas importantes del cuidado de tu mascota, como vacunas,
            medicamentos, citas veterinarias o grooming.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 min-w-0">
              {errorMessage}
            </div>
          ) : null}

          <form action={createPetReminderWithPet} className="mt-8 grid gap-5 min-w-0">
            <input type="hidden" name="status" value="pending" />
            <input type="hidden" name="source" value="manual" />

            <label className="block text-sm font-semibold text-slate-700 min-w-0">
              Título
              <input
                name="title"
                type="text"
                required
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                placeholder="Ej. Dar medicamento mensual"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block text-sm font-semibold text-slate-700 min-w-0">
                Tipo de recordatorio
                <select
                  name="reminder_type"
                  required
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                >
                  <option value="" disabled>
                    Seleccioná un tipo
                  </option>
                  <option value="vaccine">Vacuna</option>
                  <option value="medication">Medicamento</option>
                  <option value="vet_visit">Cita veterinaria</option>
                  <option value="deworming">Desparasitacion</option>
                  <option value="grooming">Grooming</option>
                  <option value="feeding">Alimentacion</option>
                  <option value="other">Otro</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700 min-w-0">
                Fecha del recordatorio
                <input
                  name="due_at"
                  type="date"
                  required
                  defaultValue={getTodayInputValue()}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700 min-w-0">
              Notas
              <textarea
                name="notes"
                rows={4}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                placeholder="Agrega detalles opcionales para este recordatorio."
              />
            </label>

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end min-w-0">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/recordatorios`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Guardar recordatorio
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
