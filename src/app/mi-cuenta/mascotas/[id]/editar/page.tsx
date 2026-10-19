import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePet } from "@/actions/pets";
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
};

type EditarMascotaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el nombre y la especie de tu mascota.",
  sex: "Seleccioná un sexo válido.",
  weight: "Ingresá un peso válido.",
  save: "No pudimos guardar los cambios. Intentalo nuevamente.",
};

function inputValue(value: string | number | null) {
  return value ?? "";
}

export default async function EditarMascotaPage({
  params,
  searchParams,
}: EditarMascotaPageProps) {
  const { id } = await params;
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: `/mi-cuenta/mascotas/${id}/editar`,
    profileErrorLogMessage: "Failed to load customer profile role",
    unauthenticatedRedirectPath: "/login",
  });

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select(
      "id, name, species, sex, breed, birth_date, weight, allergies, current_food, care_notes",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<Pet>();

  if (petError) {
    console.error("Failed to load customer pet for editing", petError);
  }

  if (!pet || petError) {
    redirect("/mi-cuenta/mascotas");
  }

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;
  const updatePetWithId = updatePet.bind(null, pet.id);

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/mi-cuenta/mascotas/${pet.id}`}
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a la mascota
          </Link>
        </div>

        <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Mis mascotas
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
            Editar mascota
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Actualizá los datos básicos y notas de cuidado de esta mascota.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={updatePetWithId} className="mt-8 grid min-w-0 gap-6">
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Nombre
                </span>
                <input
                  type="text"
                  name="name"
                  defaultValue={pet.name}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Especie
                </span>
                <input
                  type="text"
                  name="species"
                  defaultValue={pet.species}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                  required
                />
              </label>
            </div>

            <div className="grid min-w-0 gap-5 sm:grid-cols-3">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Sexo
                </span>
                <select
                  name="sex"
                  defaultValue={pet.sex || "unknown"}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                >
                  <option value="unknown">No indicado</option>
                  <option value="male">Macho</option>
                  <option value="female">Hembra</option>
                </select>
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Raza
                </span>
                <input
                  type="text"
                  name="breed"
                  defaultValue={inputValue(pet.breed)}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  autoComplete="off"
                />
              </label>

              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Peso
                </span>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.01"
                  defaultValue={inputValue(pet.weight)}
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  placeholder="kg"
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Fecha de nacimiento
              </span>
              <input
                type="date"
                name="birth_date"
                defaultValue={inputValue(pet.birth_date)}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Alergias
              </span>
              <textarea
                name="allergies"
                rows={3}
                defaultValue={inputValue(pet.allergies)}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Alimento actual
              </span>
              <input
                type="text"
                name="current_food"
                defaultValue={inputValue(pet.current_food)}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                autoComplete="off"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-brand-dark">
                Notas de cuidado
              </span>
              <textarea
                name="care_notes"
                rows={4}
                defaultValue={inputValue(pet.care_notes)}
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-dark/10 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={`/mi-cuenta/mascotas/${pet.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-dark/60"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
