import Link from "next/link";
import { createPet } from "@/actions/pets";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresá el nombre y la especie de tu mascota.",
  sex: "Seleccioná un sexo válido.",
  weight: "Ingresá un peso válido.",
  save: "No pudimos guardar la mascota. Intentalo nuevamente.",
};

type NuevaMascotaPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NuevaMascotaPage({
  searchParams,
}: NuevaMascotaPageProps) {
  await requireCustomerPageUser({
    redirectPath: "/mi-cuenta/mascotas/nueva",
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error]
    : null;

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto min-w-0 max-w-3xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/mascotas"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a mis mascotas
          </Link>
        </div>

        <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Mis mascotas
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
            Agregar mascota
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Registrá la información básica de tu mascota para preparar su
            perfil.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          ) : null}

          <form action={createPet} className="mt-8 grid min-w-0 gap-6">
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-brand-dark">
                  Nombre
                </span>
                <input
                  type="text"
                  name="name"
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
                  className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                  placeholder="Perro, gato..."
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
                  defaultValue="unknown"
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
                className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-dark/10 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href="/mi-cuenta/mascotas"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-center text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-dark/60"
              >
                Guardar mascota
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
