import Link from "next/link";
import { redirect } from "next/navigation";
import { archivePet } from "@/actions/pets";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

type Pet = {
  id: string;
  name: string;
  species: string;
  sex: string | null;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  allergies: string | null;
  current_food: string | null;
  care_notes: string | null;
  archived_at: string | null;
};

type WeightLogSummary = {
  id: string;
  weight: number | string;
  measured_at: string;
  created_at: string;
};

type VaccinationSummary = {
  id: string;
  vaccine_name: string;
  administered_at: string;
  created_at: string;
};

type NextVaccinationDue = {
  id: string;
  vaccine_name: string;
  next_due_at: string;
};

type ReminderSummary = {
  id: string;
  title: string;
  due_at: string;
};

type ActiveMedicationSummary = {
  id: string;
  medication_name: string;
  start_date: string;
  created_at: string;
};

type MedicalRecordSummary = {
  id: string;
  title: string;
  occurred_at: string;
  created_at: string;
};

type MascotaDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

const sexLabels: Record<string, string> = {
  male: "Macho",
  female: "Hembra",
  unknown: "No indicado",
};

function displayValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Pendiente";
}

function formatWeight(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return `${value} kg`;
  }

  return value?.trim() ? `${value} kg` : "Pendiente";
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

function formatBirthDate(value: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatSex(value: string | null) {
  if (!value) {
    return "No indicado";
  }

  return sexLabels[value] || "No indicado";
}

export default async function MascotaDetallePage({
  params,
}: MascotaDetallePageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select(
      "id, name, species, sex, breed, birth_date, weight, allergies, current_food, care_notes, archived_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet detail", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const archivePetWithId = archivePet.bind(null, pet.id);
  const isArchived = Boolean(pet.archived_at);
  const today = getTodayInputValue();
  const {
    data: latestWeightLogs,
    count: weightLogsCount,
    error: weightLogsError,
  } = await supabase
    .from("pet_weight_logs")
    .select("id, weight, measured_at, created_at", { count: "exact" })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<WeightLogSummary[]>();

  if (weightLogsError) {
    console.error("Failed to load customer pet weight summary", weightLogsError);
  }

  const latestWeightLog = weightLogsError ? null : latestWeightLogs?.[0];
  const totalWeightLogs = weightLogsError ? 0 : weightLogsCount ?? 0;
  const {
    data: latestVaccinations,
    count: vaccinationsCount,
    error: vaccinationsError,
  } = await supabase
    .from("pet_vaccinations")
    .select("id, vaccine_name, administered_at, created_at", { count: "exact" })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .order("administered_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<VaccinationSummary[]>();

  if (vaccinationsError) {
    console.error("Failed to load customer pet vaccination summary", vaccinationsError);
  }

  const { data: nextVaccinationsDue, error: nextVaccinationDueError } =
    await supabase
      .from("pet_vaccinations")
      .select("id, vaccine_name, next_due_at")
      .eq("pet_id", pet.id)
      .eq("user_id", user.id)
      .not("next_due_at", "is", null)
      .gte("next_due_at", today)
      .order("next_due_at", { ascending: true })
      .limit(1)
      .returns<NextVaccinationDue[]>();

  if (nextVaccinationDueError) {
    console.error(
      "Failed to load customer pet next vaccination due",
      nextVaccinationDueError,
    );
  }

  const latestVaccination = vaccinationsError ? null : latestVaccinations?.[0];
  const totalVaccinations = vaccinationsError ? 0 : vaccinationsCount ?? 0;
  const nextVaccinationDue = nextVaccinationDueError
    ? null
    : nextVaccinationsDue?.[0];
  const { data: nextReminders, error: nextReminderError } = await supabase
    .from("pet_reminders")
    .select("id, title, due_at")
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("due_at", today)
    .order("due_at", { ascending: true })
    .limit(1)
    .returns<ReminderSummary[]>();

  if (nextReminderError) {
    console.error(
      "Failed to load customer pet next reminder",
      nextReminderError,
    );
  }

  const {
    count: remindersCount,
    error: remindersCountError,
  } = await supabase
    .from("pet_reminders")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id);

  if (remindersCountError) {
    console.error(
      "Failed to load customer pet reminders count",
      remindersCountError,
    );
  }

  const {
    count: pendingRemindersCount,
    error: pendingRemindersCountError,
  } = await supabase
    .from("pet_reminders")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("due_at", today);

  if (pendingRemindersCountError) {
    console.error(
      "Failed to load customer pet pending reminders count",
      pendingRemindersCountError,
    );
  }

  const {
    count: overdueRemindersCount,
    error: overdueRemindersCountError,
  } = await supabase
    .from("pet_reminders")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("due_at", today);

  if (overdueRemindersCountError) {
    console.error(
      "Failed to load customer pet overdue reminders count",
      overdueRemindersCountError,
    );
  }

  const {
    count: completedRemindersCount,
    error: completedRemindersCountError,
  } = await supabase
    .from("pet_reminders")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (completedRemindersCountError) {
    console.error(
      "Failed to load customer pet completed reminders count",
      completedRemindersCountError,
    );
  }

  const nextReminder = nextReminderError ? null : nextReminders?.[0];
  const totalReminders = remindersCountError ? 0 : remindersCount ?? 0;
  const pendingReminders = pendingRemindersCountError
    ? 0
    : pendingRemindersCount ?? 0;
  const overdueReminders = overdueRemindersCountError
    ? 0
    : overdueRemindersCount ?? 0;
  const completedReminders = completedRemindersCountError
    ? 0
    : completedRemindersCount ?? 0;
  const { data: latestActiveMedications, error: latestMedicationError } =
    await supabase
      .from("pet_medications")
      .select("id, medication_name, start_date, created_at")
      .eq("pet_id", pet.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ActiveMedicationSummary[]>();

  if (latestMedicationError) {
    console.error(
      "Failed to load customer pet latest active medication",
      latestMedicationError,
    );
  }

  const {
    count: medicationsCount,
    error: medicationsCountError,
  } = await supabase
    .from("pet_medications")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id);

  if (medicationsCountError) {
    console.error(
      "Failed to load customer pet medications count",
      medicationsCountError,
    );
  }

  const {
    count: activeMedicationsCount,
    error: activeMedicationsCountError,
  } = await supabase
    .from("pet_medications")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (activeMedicationsCountError) {
    console.error(
      "Failed to load customer pet active medications count",
      activeMedicationsCountError,
    );
  }

  const {
    count: pausedMedicationsCount,
    error: pausedMedicationsCountError,
  } = await supabase
    .from("pet_medications")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "paused");

  if (pausedMedicationsCountError) {
    console.error(
      "Failed to load customer pet paused medications count",
      pausedMedicationsCountError,
    );
  }

  const {
    count: completedMedicationsCount,
    error: completedMedicationsCountError,
  } = await supabase
    .from("pet_medications")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (completedMedicationsCountError) {
    console.error(
      "Failed to load customer pet completed medications count",
      completedMedicationsCountError,
    );
  }

  const latestActiveMedication = latestMedicationError
    ? null
    : latestActiveMedications?.[0];
  const totalMedications = medicationsCountError ? 0 : medicationsCount ?? 0;
  const activeMedications = activeMedicationsCountError
    ? 0
    : activeMedicationsCount ?? 0;
  const pausedMedications = pausedMedicationsCountError
    ? 0
    : pausedMedicationsCount ?? 0;
  const completedMedications = completedMedicationsCountError
    ? 0
    : completedMedicationsCount ?? 0;
  const { data: latestMedicalRecords, error: latestMedicalRecordError } =
    await supabase
      .from("pet_medical_records")
      .select("id, title, occurred_at, created_at")
      .eq("pet_id", pet.id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<MedicalRecordSummary[]>();

  if (latestMedicalRecordError) {
    console.error(
      "Failed to load customer pet latest medical record",
      latestMedicalRecordError,
    );
  }

  const {
    count: medicalRecordsCount,
    error: medicalRecordsCountError,
  } = await supabase
    .from("pet_medical_records")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id);

  if (medicalRecordsCountError) {
    console.error(
      "Failed to load customer pet medical records count",
      medicalRecordsCountError,
    );
  }

  const {
    count: consultationRecordsCount,
    error: consultationRecordsCountError,
  } = await supabase
    .from("pet_medical_records")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("record_type", "consultation");

  if (consultationRecordsCountError) {
    console.error(
      "Failed to load customer pet consultation records count",
      consultationRecordsCountError,
    );
  }

  const {
    count: emergencyRecordsCount,
    error: emergencyRecordsCountError,
  } = await supabase
    .from("pet_medical_records")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .eq("record_type", "emergency");

  if (emergencyRecordsCountError) {
    console.error(
      "Failed to load customer pet emergency records count",
      emergencyRecordsCountError,
    );
  }

  const latestMedicalRecord = latestMedicalRecordError
    ? null
    : latestMedicalRecords?.[0];
  const totalMedicalRecords = medicalRecordsCountError
    ? 0
    : medicalRecordsCount ?? 0;
  const consultationRecords = consultationRecordsCountError
    ? 0
    : consultationRecordsCount ?? 0;
  const emergencyRecords = emergencyRecordsCountError
    ? 0
    : emergencyRecordsCount ?? 0;

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/mascotas"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a mis mascotas
          </Link>
        </div>

        <header className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Perfil de mascota
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere] sm:text-4xl">
                {displayValue(pet.name)}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Información general y base para el expediente digital de esta
                mascota.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="inline-flex rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {displayValue(pet.species)}
                </span>
                {isArchived ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    Archivada
                  </span>
                ) : null}
              </div>
              {!isArchived ? (
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link
                    href={`/mi-cuenta/mascotas/${pet.id}/editar`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                  >
                    Editar mascota
                  </Link>
                  <form action={archivePetWithId}>
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      Archivar mascota
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              Datos principales
            </h2>
            <dl className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Nombre
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {displayValue(pet.name)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Especie
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {displayValue(pet.species)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Sexo
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {formatSex(pet.sex)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Raza
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {displayValue(pet.breed)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Fecha nacimiento
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {formatBirthDate(pet.birth_date)}
                </dd>
              </div>
              <div className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                  Peso
                </dt>
                <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {pet.weight !== null ? `${pet.weight} kg` : "Pendiente"}
                </dd>
              </div>
            </dl>
          </article>

          <aside className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              Cuidado diario
            </h2>
            <dl className="mt-6 grid min-w-0 gap-4">
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-brand-dark">
                  Alergias
                </dt>
                <dd className="mt-2 rounded-xl bg-brand-light/60 p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                  {displayValue(pet.allergies)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-brand-dark">
                  Alimento actual
                </dt>
                <dd className="mt-2 rounded-xl bg-brand-light/60 p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                  {displayValue(pet.current_food)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm font-semibold text-brand-dark">
                  Notas de cuidado
                </dt>
                <dd className="mt-2 rounded-xl bg-brand-light/60 p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                  {displayValue(pet.care_notes)}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">
                Expediente digital
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Consultá el seguimiento histórico de salud y cuidado de esta
                mascota.
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota está archivada. El expediente queda disponible
                  solo para consulta.
                </p>
              ) : null}
            </div>
            <span className="inline-flex rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
              Disponible
            </span>
          </div>

          <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
            <article className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-brand-dark">
                    Peso histórico
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalWeightLogs > 0
                      ? "Consultá las mediciones registradas para el seguimiento de peso."
                      : isArchived
                        ? "No hay registros de peso para consultar."
                        : "Aún no hay registros de peso. Ingresá al historial para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple sm:self-start">
                  Peso
                </span>
              </div>

              <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3">
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Último peso
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestWeightLog
                      ? formatWeight(latestWeightLog.weight)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Última medición
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestWeightLog
                      ? formatDate(latestWeightLog.measured_at)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {totalWeightLogs}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/peso`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Ver historial de peso
              </Link>
            </article>

            <article className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-brand-dark">
                    Vacunas
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalVaccinations > 0
                      ? "Consultá las vacunas registradas y próximas dosis."
                      : isArchived
                        ? "No hay vacunas registradas para consultar."
                        : "Aún no hay vacunas registradas. Ingresá al módulo para agregar la primera."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple sm:self-start">
                  Vacunas
                </span>
              </div>

              <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Última vacuna
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestVaccination
                      ? displayValue(latestVaccination.vaccine_name)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Última aplicación
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestVaccination
                      ? formatDate(latestVaccination.administered_at)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Próxima dosis
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {nextVaccinationDue
                      ? formatDate(nextVaccinationDue.next_due_at)
                      : "Pendiente"}
                  </dd>
                  {nextVaccinationDue ? (
                    <p className="mt-1 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                      {displayValue(nextVaccinationDue.vaccine_name)}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {totalVaccinations}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Ver vacunas
              </Link>
            </article>

            <article className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-brand-dark">
                    Recordatorios
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalReminders > 0
                      ? "Consultá los recordatorios pendientes, vencidos y completados."
                      : isArchived
                        ? "No hay recordatorios registrados para consultar."
                        : "Aún no hay recordatorios registrados. Ingresá al módulo para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple sm:self-start">
                  Disponible
                </span>
              </div>

              <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Próximo recordatorio
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {nextReminder
                      ? displayValue(nextReminder.title)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Fecha próxima
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {nextReminder ? formatDate(nextReminder.due_at) : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Pendientes
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {pendingReminders}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Vencidos
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {overdueReminders}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Completados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {completedReminders}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {totalReminders}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/recordatorios`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Ver recordatorios
              </Link>
            </article>

            <article className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-brand-dark">
                    Medicamentos
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalMedications > 0
                      ? "Consultá medicamentos y tratamientos activos, pausados y completados."
                      : isArchived
                        ? "No hay medicamentos registrados para consultar."
                        : "Aún no hay medicamentos registrados. Ingresá al módulo para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple sm:self-start">
                  Disponible
                </span>
              </div>

              <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Medicamento activo más reciente
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestActiveMedication
                      ? displayValue(latestActiveMedication.medication_name)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Fecha de inicio
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestActiveMedication
                      ? formatDate(latestActiveMedication.start_date)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Activos
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {activeMedications}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Pausados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {pausedMedications}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Completados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {completedMedications}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {totalMedications}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Ver medicamentos
              </Link>
            </article>

            <article className="min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-bold tracking-tight text-brand-dark">
                    Historial médico
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalMedicalRecords > 0
                      ? "Consultá eventos médicos, consultas y emergencias registradas."
                      : isArchived
                        ? "No hay eventos médicos registrados para consultar."
                        : "Aún no hay eventos médicos registrados. Ingresá al módulo para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple sm:self-start">
                  Disponible
                </span>
              </div>

              <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Último evento médico
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestMedicalRecord
                      ? displayValue(latestMedicalRecord.title)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Fecha último evento
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {latestMedicalRecord
                      ? formatDate(latestMedicalRecord.occurred_at)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Consultas
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {consultationRecords}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Emergencias
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {emergencyRecords}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-white p-4 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 [overflow-wrap:anywhere]">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {totalMedicalRecords}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/historial-medico`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Ver historial médico
              </Link>
            </article>
          </div>

          <div className="mt-4 min-w-0 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
            <p className="font-semibold text-slate-900">Próximos módulos</p>
            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["Documentos"].map((item) => (
                <div key={item} className="rounded-xl bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {item}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                    Próximamente
                  </p>
                </div>
              ))}
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
