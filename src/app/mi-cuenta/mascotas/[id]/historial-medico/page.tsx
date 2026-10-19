import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

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
  created_at: string;
  updated_at: string;
};

type HistorialMedicoPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delete: "No pudimos eliminar el evento médico. Intentalo nuevamente.",
  archived: "Esta mascota está archivada y solo permite consulta.",
};

const recordTypeLabels: Record<string, string> = {
  consultation: "Consultá",
  symptom: "Sintoma",
  diagnosis: "Diagnóstico",
  treatment: "Tratamiento",
  procedure: "Procedimiento",
  surgery: "Cirugia",
  emergency: "Emergencia",
  exam_result: "Resultado de examen",
  follow_up: "Control",
  note: "Nota",
  other: "Otro",
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

function formatRecordType(value: string) {
  return recordTypeLabels[value] || "Otro";
}

function MedicalRecordCard({
  petId,
  record,
  canEdit,
}: {
  petId: string;
  record: MedicalRecord;
  canEdit: boolean;
}) {
  return (
    <article className="rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
            {displayValue(record.title)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 [overflow-wrap:anywhere]">
            Fecha: {formatDate(record.occurred_at)}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 sm:self-start [overflow-wrap:anywhere]">
          {formatRecordType(record.record_type)}
        </span>
      </div>

      {(record.clinic_name || record.veterinarian_name) ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 min-w-0">
          {record.clinic_name ? (
            <div className="rounded-xl bg-white p-4 min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
                Clínica
              </dt>
              <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {record.clinic_name}
              </dd>
            </div>
          ) : null}
          {record.veterinarian_name ? (
            <div className="rounded-xl bg-white p-4 min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
                Veterinario
              </dt>
              <dd className="mt-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {record.veterinarian_name}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {record.symptoms ? (
        <div className="mt-4 rounded-xl bg-white p-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Síntomas
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            {record.symptoms}
          </p>
        </div>
      ) : null}

      {record.diagnosis ? (
        <div className="mt-4 rounded-xl bg-white p-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Diagnóstico
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            {record.diagnosis}
          </p>
        </div>
      ) : null}

      {record.treatment ? (
        <div className="mt-4 rounded-xl bg-white p-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Tratamiento
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            {record.treatment}
          </p>
        </div>
      ) : null}

      {record.notes ? (
        <div className="mt-4 rounded-xl bg-white p-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
            Notas
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            {record.notes}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
        Creado: {formatDate(record.created_at)} - Actualizado:{" "}
        {formatDate(record.updated_at)}
      </p>

      {canEdit ? (
        <div className="mt-4 flex justify-end min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${petId}/historial-medico/${record.id}/editar`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Editar
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default async function HistorialMedicoPage({
  params,
  searchParams,
}: HistorialMedicoPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/historial-medico`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet medical history", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: recordData, error: recordsError } = await supabase
    .from("pet_medical_records")
    .select(
      "id, record_type, title, occurred_at, symptoms, diagnosis, treatment, clinic_name, veterinarian_name, notes, created_at, updated_at",
    )
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<MedicalRecord[]>();

  if (recordsError) {
    console.error("Failed to load customer pet medical records", recordsError);
  }

  const records = recordsError ? [] : recordData || [];
  const latestRecord = records[0];
  const consultationCount = records.filter(
    (record) => record.record_type === "consultation",
  ).length;
  const emergencyCount = records.filter(
    (record) => record.record_type === "emergency",
  ).length;
  const totalCount = records.length;
  const isArchived = Boolean(pet.archived_at);
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
                Historial médico
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 [overflow-wrap:anywhere]">
                  Esta mascota está archivada. El historial médico queda
                  disponible solo para consulta.
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
                  href={`/mi-cuenta/mascotas/${pet.id}/historial-medico/nuevo`}
                  className="inline-flex justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar evento
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5 min-w-0">
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Último evento
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestRecord ? displayValue(latestRecord.title) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Fecha último evento
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {latestRecord ? formatDate(latestRecord.occurred_at) : "Pendiente"}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Consultas
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {consultationCount}
            </p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm min-w-0 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 [overflow-wrap:anywhere]">
              Emergencias
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
              {emergencyCount}
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
              <h2 className="text-xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Eventos médicos
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Eventos registrados para el historial médico de esta mascota.
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-brand-light/50 px-6 py-10 text-center min-w-0">
              <h3 className="text-lg font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Aún no hay eventos médicos registrados.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {isArchived
                  ? "No hay eventos médicos registrados para consultar."
                  : "Cuando agregues consultas, síntomas, diagnósticos o notas médicas, aparecerán aquí ordenados desde el más reciente."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 min-w-0">
              {records.map((record) => (
                <MedicalRecordCard
                  key={record.id}
                  petId={pet.id}
                  record={record}
                  canEdit={!isArchived}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
