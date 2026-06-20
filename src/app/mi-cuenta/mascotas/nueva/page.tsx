import Link from "next/link";
import { createPet } from "@/actions/pets";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

const errorMessages: Record<string, string> = {
  profile: "No pudimos validar tu perfil. Intentalo nuevamente.",
  required: "Ingresa el nombre y la especie de tu mascota.",
  sex: "Selecciona un sexo valido.",
  weight: "Ingresa un peso valido.",
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/mascotas"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mis mascotas
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Mis mascotas
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Agregar mascota
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Registra la informacion basica de tu mascota para preparar su
            perfil.
          </p>

          {errorMessage ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <form action={createPet} className="mt-8 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Nombre
                </span>
                <input
                  type="text"
                  name="name"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Especie
                </span>
                <input
                  type="text"
                  name="species"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Perro, gato..."
                  autoComplete="off"
                  required
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Sexo
                </span>
                <select
                  name="sex"
                  defaultValue="unknown"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="unknown">No indicado</option>
                  <option value="male">Macho</option>
                  <option value="female">Hembra</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Raza
                </span>
                <input
                  type="text"
                  name="breed"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-800">
                  Peso
                </span>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="kg"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Fecha de nacimiento
              </span>
              <input
                type="date"
                name="birth_date"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Alergias
              </span>
              <textarea
                name="allergies"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Alimento actual
              </span>
              <input
                type="text"
                name="current_food"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                Notas de cuidado
              </span>
              <textarea
                name="care_notes"
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/mi-cuenta/mascotas"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
