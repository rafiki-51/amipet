import Link from "next/link";
import { redirect } from "next/navigation";
import { createPetVaccination } from "@/actions/pet-vaccinations";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el nombre de la vacuna y la fecha aplicada.",
  date: "Ingresá una fecha aplicada válida.",
  "future-date": "La fecha aplicada no puede estar en el futuro.",
  "next-due-date": "Ingresá una próxima dosis válida.",
  status: "No pudimos validar el estado de la vacuna.",
  archived: "Esta mascota está archivada y no permite nuevas vacunas.",
  save: "No pudimos guardar la vacuna. Intentalo nuevamente.",
};

type Pet = {
  id: string;
  name: string;
  species: string;
  archived_at: string | null;
};

type NuevaVacunaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

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

export default async function NuevaVacunaPage({
  params,
  searchParams,
}: NuevaVacunaPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/vacunas/nueva`,
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("id, name, species, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet for vaccination creation", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${pet.id}/vacunas`);
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const createPetVaccinationWithId = createPetVaccination.bind(null, pet.id);

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a vacunas
          </Link>
        </div>

        <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
                Expediente digital
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                Agregar vacuna
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                Registrá una vacuna aplicada para {displayValue(pet.name)}.
              </p>
            </div>
            <span className="inline-flex max-w-full rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark [overflow-wrap:anywhere] sm:self-start">
              {displayValue(pet.species)}
            </span>
          </div>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={createPetVaccinationWithId} className="mt-8 grid min-w-0 gap-6">
            <input type="hidden" name="status" value="applied" />

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Nombre de la vacuna
              </span>
              <input
                type="text"
                name="vaccine_name"
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                autoComplete="off"
                required
              />
            </label>

            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Fecha aplicada
                </span>
                <input
                  type="date"
                  name="administered_at"
                  defaultValue={getTodayInputValue()}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Próxima dosis
                </span>
                <input
                  type="date"
                  name="next_due_at"
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                />
              </label>
            </div>

            <div className="grid min-w-0 gap-5 sm:grid-cols-3">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Clínica
                </span>
                <input
                  type="text"
                  name="clinic_name"
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Veterinario
                </span>
                <input
                  type="text"
                  name="veterinarian_name"
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Lote
                </span>
                <input
                  type="text"
                  name="batch_number"
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
                  autoComplete="off"
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Notas
              </span>
              <textarea
                name="notes"
                rows={4}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-dark/10 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}/vacunas`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Guardar vacuna
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
