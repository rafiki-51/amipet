import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deletePetVaccination,
  updatePetVaccination,
} from "@/actions/pet-vaccinations";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el nombre de la vacuna y la fecha aplicada.",
  date: "Ingresá una fecha aplicada válida.",
  "future-date": "La fecha aplicada no puede estar en el futuro.",
  "next-due-date": "Ingresá una próxima dosis válida.",
  status: "No pudimos validar el estado de la vacuna.",
  archived: "Esta mascota está archivada y no permite editar vacunas.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type Vaccination = {
  id: string;
  vaccine_name: string;
  administered_at: string;
  next_due_at: string | null;
  clinic_name: string | null;
  veterinarian_name: string | null;
  batch_number: string | null;
  notes: string | null;
  status: string;
};

type EditarVacunaPageProps = {
  params: Promise<{
    id: string;
    vaccinationId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Pendiente";
}

function inputValue(value: string | null) {
  return value ?? "";
}

export default async function EditarVacunaPage({
  params,
  searchParams,
}: EditarVacunaPageProps) {
  const { id, vaccinationId } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/vacunas/${vaccinationId}/editar`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet for vaccination editing", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/vacunas`);
  }

  const { data: vaccination, error: vaccinationError } = await supabase
    .from("pet_vaccinations")
    .select(
      "id, vaccine_name, administered_at, next_due_at, clinic_name, veterinarian_name, batch_number, notes, status",
    )
    .eq("id", vaccinationId)
    .eq("pet_id", pet.id)
    .eq("user_id", user.id)
    .maybeSingle<Vaccination>();

  if (vaccinationError) {
    console.error(
      "Failed to load customer pet vaccination for editing",
      vaccinationError,
    );
  }

  if (!vaccination || vaccinationError) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/vacunas`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updatePetVaccinationWithIds = updatePetVaccination.bind(
    null,
    pet.id,
    vaccination.id,
  );
  const deletePetVaccinationWithIds = deletePetVaccination.bind(
    null,
    pet.id,
    vaccination.id,
  );

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 sm:px-6 py-8 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl min-w-0">
        <div className="mb-6 min-w-0">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
            className="text-sm font-semibold text-brand-dark hover:underline min-h-11 min-w-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 inline-flex rounded-lg"
          >
            Volver a vacunas
          </Link>
        </div>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark [overflow-wrap:anywhere]">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Editar vacuna
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Actualizá el registro de vacuna de {displayValue(pet.name)}.
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

          <form action={updatePetVaccinationWithIds} className="mt-8 grid gap-5 min-w-0">
            <input type="hidden" name="status" value="applied" />

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                Nombre de la vacuna
              </span>
              <input
                type="text"
                name="vaccine_name"
                defaultValue={vaccination.vaccine_name}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Fecha aplicada
                </span>
                <input
                  type="date"
                  name="administered_at"
                  defaultValue={vaccination.administered_at}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Próxima dosis
                </span>
                <input
                  type="date"
                  name="next_due_at"
                  defaultValue={inputValue(vaccination.next_due_at)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-3 min-w-0">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Clínica
                </span>
                <input
                  type="text"
                  name="clinic_name"
                  defaultValue={inputValue(vaccination.clinic_name)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Veterinario
                </span>
                <input
                  type="text"
                  name="veterinarian_name"
                  defaultValue={inputValue(vaccination.veterinarian_name)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  Lote
                </span>
                <input
                  type="text"
                  name="batch_number"
                  defaultValue={inputValue(vaccination.batch_number)}
                  className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
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
                defaultValue={inputValue(vaccination.notes)}
                className="mt-2 w-full rounded-xl border border-brand-dark/25 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 min-h-11 min-w-0 max-w-full bg-white text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end min-w-0">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
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

        <section className="mt-5 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:p-8 min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-red-800 [overflow-wrap:anywhere]">
            Eliminar vacuna
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            Esta acción elimina permanentemente este registro del expediente.
          </p>
          <form action={deletePetVaccinationWithIds} className="mt-6 min-w-0">
            <button
              type="submit"
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            >
              Eliminar vacuna
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
