import Link from "next/link";
import { redirect } from "next/navigation";
import { archivePet } from "@/actions/pets";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mi-cuenta/mascotas");
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/mascotas"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mis mascotas
          </Link>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Perfil de mascota
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {displayValue(pet.name)}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Informacion general y base para el expediente digital de esta
                mascota.
              </p>
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
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link
                    href={`/mi-cuenta/mascotas/${pet.id}/editar`}
                    className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    Editar mascota
                  </Link>
                  <form action={archivePetWithId}>
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                    >
                      Archivar mascota
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Datos principales
            </h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nombre
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.name)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Especie
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.species)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Sexo
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {formatSex(pet.sex)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Raza
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {displayValue(pet.breed)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Fecha nacimiento
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {formatBirthDate(pet.birth_date)}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Peso
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {pet.weight !== null ? `${pet.weight} kg` : "Pendiente"}
                </dd>
              </div>
            </dl>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Cuidado diario
            </h2>
            <dl className="mt-6 grid gap-4">
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Alergias
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.allergies)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Alimento actual
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.current_food)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-slate-800">
                  Notas de cuidado
                </dt>
                <dd className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {displayValue(pet.care_notes)}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Expediente digital
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Consulta el seguimiento historico de salud y cuidado de esta
                mascota.
              </p>
              {isArchived ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  Esta mascota esta archivada. El expediente queda disponible
                  solo para consulta.
                </p>
              ) : null}
            </div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              Disponible
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950">
                    Peso historico
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalWeightLogs > 0
                      ? "Consulta las mediciones registradas para el seguimiento de peso."
                      : isArchived
                        ? "No hay registros de peso para consultar."
                        : "Aun no hay registros de peso. Ingresa al historial para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 sm:self-start">
                  Peso
                </span>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ultimo peso
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestWeightLog
                      ? formatWeight(latestWeightLog.weight)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ultima medicion
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestWeightLog
                      ? formatDate(latestWeightLog.measured_at)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {totalWeightLogs}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/peso`}
                className="mt-5 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ver historial de peso
              </Link>
            </article>

            <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950">
                    Vacunas
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalVaccinations > 0
                      ? "Consulta las vacunas registradas y proximas dosis."
                      : isArchived
                        ? "No hay vacunas registradas para consultar."
                        : "Aun no hay vacunas registradas. Ingresa al modulo para agregar la primera."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 sm:self-start">
                  Vacunas
                </span>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ultima vacuna
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestVaccination
                      ? displayValue(latestVaccination.vaccine_name)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Ultima aplicacion
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestVaccination
                      ? formatDate(latestVaccination.administered_at)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Proxima dosis
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {nextVaccinationDue
                      ? formatDate(nextVaccinationDue.next_due_at)
                      : "Pendiente"}
                  </dd>
                  {nextVaccinationDue ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {displayValue(nextVaccinationDue.vaccine_name)}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {totalVaccinations}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
                className="mt-5 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ver vacunas
              </Link>
            </article>

            <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950">
                    Recordatorios
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalReminders > 0
                      ? "Consulta los recordatorios pendientes, vencidos y completados."
                      : isArchived
                        ? "No hay recordatorios registrados para consultar."
                        : "Aun no hay recordatorios registrados. Ingresa al modulo para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 sm:self-start">
                  Disponible
                </span>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Proximo recordatorio
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {nextReminder
                      ? displayValue(nextReminder.title)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Fecha proxima
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {nextReminder ? formatDate(nextReminder.due_at) : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pendientes
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {pendingReminders}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Vencidos
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {overdueReminders}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Completados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {completedReminders}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {totalReminders}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/recordatorios`}
                className="mt-5 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ver recordatorios
              </Link>
            </article>

            <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-950">
                    Medicamentos
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {totalMedications > 0
                      ? "Consulta medicamentos y tratamientos activos, pausados y completados."
                      : isArchived
                        ? "No hay medicamentos registrados para consultar."
                        : "Aun no hay medicamentos registrados. Ingresa al modulo para agregar el primero."}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 sm:self-start">
                  Disponible
                </span>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Medicamento activo mas reciente
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestActiveMedication
                      ? displayValue(latestActiveMedication.medication_name)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Fecha de inicio
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {latestActiveMedication
                      ? formatDate(latestActiveMedication.start_date)
                      : "Pendiente"}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Activos
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {activeMedications}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Pausados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {pausedMedications}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Completados
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {completedMedications}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Total registros
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-950">
                    {totalMedications}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/medicamentos`}
                className="mt-5 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Ver medicamentos
              </Link>
            </article>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Proximos modulos</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Historial medico",
                "Documentos",
              ].map((item) => (
                <div key={item} className="rounded-xl bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {item}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Proximamente
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
