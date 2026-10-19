import Link from "next/link";
import { redirect } from "next/navigation";
import {
  completePetReminder,
  deletePetReminder,
  reopenPetReminder,
  updatePetReminder,
} from "@/actions/pet-reminders";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el título, tipo y fecha del recordatorio.",
  type: "Seleccioná un tipo de recordatorio válido.",
  date: "Ingresá una fecha válida.",
  status: "No pudimos validar el estado del recordatorio.",
  source: "No pudimos validar el origen del recordatorio.",
  vaccination: "No pudimos validar la vacuna relacionada.",
  archived: "Esta mascota está archivada y no permite editar recordatorios.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type Reminder = {
  id: string;
  title: string;
  reminder_type: string;
  due_at: string;
  completed_at: string | null;
  status: string;
  source: string;
  related_vaccination_id: string | null;
  notes: string | null;
};

type EditReminderPageProps = {
  params: Promise<{
    id: string;
    reminderId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const reminderTypeOptions = [
  { value: "vaccine", label: "Vacuna" },
  { value: "medication", label: "Medicamento" },
  { value: "vet_visit", label: "Cita veterinaria" },
  { value: "deworming", label: "Desparasitacion" },
  { value: "grooming", label: "Grooming" },
  { value: "feeding", label: "Alimentacion" },
  { value: "other", label: "Otro" },
];

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function inputValue(value: string | null) {
  return value ?? "";
}

export default async function EditReminderPage({
  params,
  searchParams,
}: EditReminderPageProps) {
  const { id, reminderId } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/recordatorios/${reminderId}/editar`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet for reminder editing", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/recordatorios`);
  }

  const { data: reminder, error: reminderError } = await supabase
    .from("pet_reminders")
    .select(
      "id, title, reminder_type, due_at, completed_at, status, source, related_vaccination_id, notes",
    )
    .eq("id", reminderId)
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .maybeSingle<Reminder>();

  if (reminderError) {
    console.error(
      "Failed to load customer pet reminder for editing",
      reminderError,
    );
  }

  if (!reminder || reminderError) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/recordatorios`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updateReminderWithIds = updatePetReminder.bind(
    null,
    pet.id,
    reminder.id,
  );
  const deleteReminderWithIds = deletePetReminder.bind(
    null,
    pet.id,
    reminder.id,
  );
  const completeReminderWithIds = completePetReminder.bind(
    null,
    pet.id,
    reminder.id,
  );
  const reopenReminderWithIds = reopenPetReminder.bind(
    null,
    pet.id,
    reminder.id,
  );

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="mb-6 min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/recordatorios`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Volver a recordatorios
          </Link>
        </div>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Editar recordatorio
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Actualizá el recordatorio de {displayValue(pet.name)}.
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

          <form action={updateReminderWithIds} className="mt-8 grid gap-5 min-w-0">
            <input type="hidden" name="status" value={reminder.status} />
            <input type="hidden" name="source" value={reminder.source} />
            {reminder.related_vaccination_id ? (
              <input
                type="hidden"
                name="related_vaccination_id"
                value={reminder.related_vaccination_id}
              />
            ) : null}

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Título
              </span>
              <input
                type="text"
                name="title"
                defaultValue={reminder.title}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Tipo de recordatorio
                </span>
                <select
                  name="reminder_type"
                  defaultValue={reminder.reminder_type}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                >
                  {reminderTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Fecha del recordatorio
                </span>
                <input
                  type="date"
                  name="due_at"
                  defaultValue={reminder.due_at}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={inputValue(reminder.notes)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end min-w-0">
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
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        {reminder.status === "pending" || reminder.status === "completed" ? (
          <section className="mt-5 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">Acciones</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
              Cambiá el estado del recordatorio sin modificar el resto de la
              información.
            </p>
            {reminder.status === "pending" ? (
              <form action={completeReminderWithIds} className="mt-6 min-w-0">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Marcar como completado
                </button>
              </form>
            ) : null}
            {reminder.status === "completed" ? (
              <form action={reopenReminderWithIds} className="mt-6 min-w-0">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Reabrir recordatorio
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-red-800 [overflow-wrap:anywhere]">
            Eliminar recordatorio
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            Esta acción elimina permanentemente este registro del expediente.
          </p>
          <form action={deleteReminderWithIds} className="mt-6 min-w-0">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            >
              Eliminar recordatorio
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
