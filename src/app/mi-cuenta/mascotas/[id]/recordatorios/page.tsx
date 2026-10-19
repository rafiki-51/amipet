import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

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
  created_at: string;
  updated_at: string;
};

type RecordatoriosPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delete: "No pudimos eliminar el recordatorio. Intentalo nuevamente.",
  complete: "No pudimos completar el recordatorio. Intentalo nuevamente.",
  reopen: "No pudimos reabrir el recordatorio. Intentalo nuevamente.",
  archived: "Esta mascota está archivada y solo permite consulta.",
};

const reminderTypeLabels: Record<string, string> = {
  vaccine: "Vacuna",
  medication: "Medicamento",
  vet_visit: "Cita veterinaria",
  deworming: "Desparasitacion",
  grooming: "Grooming",
  feeding: "Alimentacion",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  canceled: "Cancelado",
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  vaccination: "Vacuna",
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Pendiente";
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReminderType(value: string) {
  return reminderTypeLabels[value] || "Otro";
}

function formatStatus(value: string) {
  return statusLabels[value] || "No indicado";
}

function formatSource(value: string) {
  return sourceLabels[value] || "No indicado";
}

function isOverdue(reminder: Reminder, today: string) {
  return reminder.status === "pending" && reminder.due_at < today;
}

function ReminderCard({
  petId,
  reminder,
  today,
  canEdit,
}: {
  petId: string;
  reminder: Reminder;
  today: string;
  canEdit: boolean;
}) {
  const overdue = isOverdue(reminder, today);

  return (
    <article className="rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
            {displayValue(reminder.title)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
            Fecha: {formatDate(reminder.due_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end min-w-0">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 [overflow-wrap:anywhere]">
            {formatReminderType(reminder.reminder_type)}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 [overflow-wrap:anywhere]">
            {formatStatus(reminder.status)}
          </span>
          {overdue ? (
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 [overflow-wrap:anywhere]">
              Vencido
            </span>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        <div className="rounded-xl bg-white p-4 min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Origen
          </dt>
          <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
            {formatSource(reminder.source)}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-4 min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Vacuna relacionada
          </dt>
          <dd className="mt-2 break-all text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
            {displayValue(reminder.related_vaccination_id)}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-4 min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Completado
          </dt>
          <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
            {formatDate(reminder.completed_at)}
          </dd>
        </div>
        <div className="rounded-xl bg-white p-4 min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Actualizado
          </dt>
          <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
            {formatDate(reminder.updated_at)}
          </dd>
        </div>
      </dl>

      {reminder.notes ? (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
          {reminder.notes}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
        Creado: {formatDate(reminder.created_at)}
      </p>

      {canEdit ? (
        <div className="mt-4 flex justify-end min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${petId}/recordatorios/${reminder.id}/editar`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Editar
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default async function RecordatoriosPage({
  params,
  searchParams,
}: RecordatoriosPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/recordatorios`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet reminders", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: reminderData, error: remindersError } = await supabase
    .from("pet_reminders")
    .select(
      "id, title, reminder_type, due_at, completed_at, status, source, related_vaccination_id, notes, created_at, updated_at",
    )
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("due_at", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<Reminder[]>();

  if (remindersError) {
    console.error("Failed to load customer pet reminders", remindersError);
  }

  const reminders = remindersError ? [] : reminderData || [];
  const today = getTodayInputValue();
  const isArchived = Boolean(pet.archived_at);
  const pendingReminders = reminders.filter(
    (reminder) => reminder.status === "pending",
  );
  const completedOrCanceledReminders = reminders.filter(
    (reminder) =>
      reminder.status === "completed" || reminder.status === "canceled",
  );
  const pendingCount = pendingReminders.length;
  const overdueCount = pendingReminders.filter((reminder) =>
    isOverdue(reminder, today),
  ).length;
  const completedCount = reminders.filter(
    (reminder) => reminder.status === "completed",
  ).length;
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-5xl min-w-0">
        <div className="mb-6 min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Volver a la mascota
          </Link>
        </div>

        <header className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
            Expediente digital
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-brand-dark [overflow-wrap:anywhere]">
                Recordatorios
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [overflow-wrap:anywhere]">
                  Esta mascota está archivada. Los recordatorios quedan
                  disponibles solo para consulta.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:items-end min-w-0">
              <div className="flex flex-wrap gap-2 sm:justify-end min-w-0">
                <span className="inline-flex rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {displayValue(pet.species)}
                </span>
                {isArchived ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
                    Archivada
                  </span>
                ) : null}
              </div>
              {!isArchived ? (
                <Link
                  href={`/mi-cuenta/mascotas/${pet.id}/recordatorios/nuevo`}
                  className="inline-flex justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar recordatorio
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-3 min-w-0">
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Pendientes
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Vencidos
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {overdueCount}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Completados
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {completedCount}
            </p>
          </div>
        </section>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 [overflow-wrap:anywhere]">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-5 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">Pendientes</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Recordatorios activos ordenados por fecha.
              </p>
            </div>
          </div>

          {reminders.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Aún no hay recordatorios.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {isArchived
                  ? "No hay recordatorios para consultar."
                  : "Cuando agregues recordatorios, aparecerán aquí ordenados por fecha."}
              </p>
            </div>
          ) : pendingReminders.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                No hay recordatorios pendientes.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Los recordatorios completados o cancelados aparecen en la
                seccion inferior.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 min-w-0">
              {pendingReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  petId={pet.id}
                  reminder={reminder}
                  today={today}
                  canEdit={!isArchived}
                />
              ))}
            </div>
          )}
        </section>

        {reminders.length > 0 ? (
          <section className="mt-5 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Completados y cancelados
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Historial de recordatorios cerrados.
              </p>
            </div>

            {completedOrCanceledReminders.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                  Aún no hay recordatorios completados o cancelados.
                </h3>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 min-w-0">
                {completedOrCanceledReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    petId={pet.id}
                    reminder={reminder}
                    today={today}
                    canEdit={!isArchived}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
