import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

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
  archived: "Esta mascota esta archivada y solo permite consulta.",
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
    <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-950">
            {displayValue(medication.medication_name)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Inicio: {formatDate(medication.start_date)}
          </p>
          {medication.end_date ? (
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Fin: {formatDate(medication.end_date)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {formatMedicationType(medication.medication_type)}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {formatStatus(medication.status)}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {medication.dosage ? (
          <div className="rounded-xl bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Dosis
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-950">
              {medication.dosage}
            </dd>
          </div>
        ) : null}
        {medication.frequency ? (
          <div className="rounded-xl bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Frecuencia
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-950">
              {medication.frequency}
            </dd>
          </div>
        ) : null}
        {medication.route ? (
          <div className="rounded-xl bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Via
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-950">
              {medication.route}
            </dd>
          </div>
        ) : null}
        {medication.prescribed_by ? (
          <div className="rounded-xl bg-white p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Prescrito por
            </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-950">
              {medication.prescribed_by}
            </dd>
          </div>
        ) : null}
      </dl>

      {medication.notes ? (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
          {medication.notes}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Creado: {formatDate(medication.created_at)} - Actualizado:{" "}
        {formatDate(medication.updated_at)}
      </p>

      {canEdit ? (
        <div className="mt-4 flex justify-end">
          <Link
            href={`/mi-cuenta/mascotas/${petId}/medicamentos/${medication.id}/editar`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mi-cuenta/mascotas/${id}/medicamentos`);
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a la mascota
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Expediente digital
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Medicamentos
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {displayValue(pet.name)}
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota esta archivada. Los medicamentos quedan
                  disponibles solo para consulta.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  {displayValue(pet.species)}
                </span>
                {isArchived ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    Archivada
                  </span>
                ) : null}
              </div>
              {!isArchived ? (
                <Link
                  href={`/mi-cuenta/mascotas/${pet.id}/medicamentos/nuevo`}
                  className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Agregar medicamento
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Activos
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {activeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Completados
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {completedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Pausados
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {pausedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total registros
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              {totalCount}
            </p>
          </div>
        </section>

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Activos</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Medicamentos o tratamientos activos y pausados.
              </p>
            </div>
          </div>

          {medications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <h3 className="text-lg font-bold tracking-tight">
                Aun no hay medicamentos registrados.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                {isArchived
                  ? "No hay medicamentos registrados para consultar."
                  : "Cuando agregues medicamentos o tratamientos, apareceran aqui ordenados desde el mas reciente."}
              </p>
            </div>
          ) : activeMedications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <h3 className="text-lg font-bold tracking-tight">
                No hay medicamentos activos.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Los medicamentos completados o cancelados aparecen en el
                historial.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
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
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Historial</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Medicamentos y tratamientos completados o cancelados.
              </p>
            </div>

            {historyMedications.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <h3 className="text-lg font-bold tracking-tight">
                  Aun no hay medicamentos en historial.
                </h3>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
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
