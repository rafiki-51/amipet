import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

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
  created_at: string;
  updated_at: string;
};

type MedicamentosPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delete: "No pudimos eliminar el medicamento. Intentalo nuevamente.",
  complete: "No pudimos completar el medicamento. Intentalo nuevamente.",
  pause: "No pudimos pausar el medicamento. Intentalo nuevamente.",
  reopen: "No pudimos reabrir el medicamento. Intentalo nuevamente.",
  archived: "Esta mascota está archivada y solo permite consulta.",
};

const medicationTypeLabels: Record<string, string> = {
  medication: "Medicamento",
  supplement: "Suplemento",
  antiparasitic: "Antiparasitario",
  vitamin: "Vitamina",
  dermatological: "Dermatologico",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  paused: "Pausado",
  canceled: "Cancelado",
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

function formatMedicationType(value: string) {
  return medicationTypeLabels[value] || "Otro";
}

function formatStatus(value: string) {
  return statusLabels[value] || "No indicado";
}

function MedicationCard({
  petId,
  medication,
  canEdit,
}: {
  petId: string;
  medication: Medication;
  canEdit: boolean;
}) {
  return (
    <article className="rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
            {displayValue(medication.medication_name)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
            Inicio: {formatDate(medication.start_date)}
          </p>
          {medication.end_date ? (
            <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
              Fin: {formatDate(medication.end_date)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end min-w-0">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 [overflow-wrap:anywhere]">
            {formatMedicationType(medication.medication_type)}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 [overflow-wrap:anywhere]">
            {formatStatus(medication.status)}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        {medication.dosage ? (
          <div className="rounded-xl bg-white p-4 min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Dosis
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
              {medication.dosage}
            </dd>
          </div>
        ) : null}
        {medication.frequency ? (
          <div className="rounded-xl bg-white p-4 min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Frecuencia
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
              {medication.frequency}
            </dd>
          </div>
        ) : null}
        {medication.route ? (
          <div className="rounded-xl bg-white p-4 min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Vía
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
              {medication.route}
            </dd>
          </div>
        ) : null}
        {medication.prescribed_by ? (
          <div className="rounded-xl bg-white p-4 min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Prescrito por
            </dt>
            <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
              {medication.prescribed_by}
            </dd>
          </div>
        ) : null}
      </dl>

      {medication.notes ? (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
          {medication.notes}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
        Creado: {formatDate(medication.created_at)} - Actualizado:{" "}
        {formatDate(medication.updated_at)}
      </p>

      {canEdit ? (
        <div className="mt-4 flex justify-end min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${petId}/medicamentos/${medication.id}/editar`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Editar
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default async function MedicamentosPage({
  params,
  searchParams,
}: MedicamentosPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/medicamentos`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet medications", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: medicationData, error: medicationsError } = await supabase
    .from("pet_medications")
    .select(
      "id, medication_name, medication_type, dosage, frequency, route, start_date, end_date, status, prescribed_by, notes, created_at, updated_at",
    )
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<Medication[]>();

  if (medicationsError) {
    console.error("Failed to load customer pet medications", medicationsError);
  }

  const medications = medicationsError ? [] : medicationData || [];
  const isArchived = Boolean(pet.archived_at);
  const activeMedications = medications.filter(
    (medication) =>
      medication.status === "active" || medication.status === "paused",
  );
  const historyMedications = medications.filter(
    (medication) =>
      medication.status === "completed" || medication.status === "canceled",
  );
  const activeCount = medications.filter(
    (medication) => medication.status === "active",
  ).length;
  const completedCount = medications.filter(
    (medication) => medication.status === "completed",
  ).length;
  const pausedCount = medications.filter(
    (medication) => medication.status === "paused",
  ).length;
  const totalCount = medications.length;
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
                Medicamentos
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [overflow-wrap:anywhere]">
                  Esta mascota está archivada. Los medicamentos quedan
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
                  href={`/mi-cuenta/mascotas/${pet.id}/medicamentos/nuevo`}
                  className="inline-flex justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar medicamento
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Activos
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {activeCount}
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
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Pausados
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {pausedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {totalCount}
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
              <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">Activos</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Medicamentos o tratamientos activos y pausados.
              </p>
            </div>
          </div>

          {medications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Aún no hay medicamentos registrados.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {isArchived
                  ? "No hay medicamentos registrados para consultar."
                  : "Cuando agregues medicamentos o tratamientos, aparecerán aquí ordenados desde el más reciente."}
              </p>
            </div>
          ) : activeMedications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                No hay medicamentos activos.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Los medicamentos completados o cancelados aparecen en el
                historial.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 min-w-0">
              {activeMedications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  petId={pet.id}
                  medication={medication}
                  canEdit={!isArchived}
                />
              ))}
            </div>
          )}
        </section>

        {medications.length > 0 ? (
          <section className="mt-5 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">Historial</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Medicamentos y tratamientos completados o cancelados.
              </p>
            </div>

            {historyMedications.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                  Aún no hay medicamentos en historial.
                </h3>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 min-w-0">
                {historyMedications.map((medication) => (
                  <MedicationCard
                    key={medication.id}
                    petId={pet.id}
                    medication={medication}
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
