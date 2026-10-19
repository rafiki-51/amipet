import Link from "next/link";
import { requireCustomerPageUser } from "@/lib/auth/customer-pages";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  current_food: string | null;
  archived_at: string | null;
};

type MascotasPageProps = {
  searchParams?: Promise<{
    estado?: string;
  }>;
};

function displayValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Pendiente";
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return null;
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

export default async function MascotasPage({ searchParams }: MascotasPageProps) {
  const resolvedSearchParams = await searchParams;
  const isArchivedView = resolvedSearchParams?.estado === "archivadas";
  const { supabase, user } = await requireCustomerPageUser({
    redirectPath: "/mi-cuenta/mascotas",
    profileErrorLogMessage: "Failed to load customer profile role",
  });

  const petsQuery = supabase
    .from("pets")
    .select(
      "id, name, species, breed, birth_date, weight, current_food, archived_at",
    )
    .eq("user_id", user.id);

  const { data: pets, error: petsError } = isArchivedView
    ? await petsQuery
        .not("archived_at", "is", null)
        .order("created_at", { ascending: false })
        .returns<Pet[]>()
    : await petsQuery
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .returns<Pet[]>();

  if (petsError) {
    console.error("Failed to load customer pets", petsError);
  }

  const hasPets = pets && pets.length > 0;

  return (
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a mi cuenta
          </Link>
        </div>

        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
              Mi cuenta
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              {isArchivedView ? "Mascotas archivadas" : "Mis mascotas"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {isArchivedView
                ? "Consulta perfiles archivados y conserva su información histórica."
                : "Consultá los perfiles y el expediente digital de tus mascotas."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {!isArchivedView ? (
              <Link
                href="/mi-cuenta/mascotas/nueva"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
              >
                Agregar mascota
              </Link>
            ) : null}
            <Link
              href={
                isArchivedView
                  ? "/mi-cuenta/mascotas"
                  : "/mi-cuenta/mascotas?estado=archivadas"
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
            >
              {isArchivedView
                ? "Ver mascotas activas"
                : "Ver mascotas archivadas"}
            </Link>
          </div>
        </header>

        <section className="mt-8">
          {!hasPets ? (
            <div className="rounded-2xl border border-dashed border-brand-dark/20 bg-white px-4 py-10 text-center shadow-sm sm:px-6 sm:py-12">
              <h2 className="text-xl font-bold tracking-tight text-brand-dark">
                {isArchivedView
                  ? "No tienes mascotas archivadas."
                  : "Aún no registraste mascotas."}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                {isArchivedView
                  ? "Cuando archives una mascota, podrás consultarla desde esta vista."
                  : "Agregá tu primera mascota para comenzar su expediente digital."}
              </p>
              {isArchivedView ? (
                <Link
                  href="/mi-cuenta/mascotas"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Ver mascotas activas
                </Link>
              ) : (
                <Link
                  href="/mi-cuenta/mascotas/nueva"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
                >
                  Agregar mascota
                </Link>
              )}
            </div>
          ) : (
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/mi-cuenta/mascotas/${pet.id}`}
                  className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm transition hover:border-brand-dark/30 hover:bg-brand-light/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(pet.species)}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-dark [overflow-wrap:anywhere]">
                        {displayValue(pet.name)}
                      </h2>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <span className="rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple">
                        Perfil
                      </span>
                      {pet.archived_at ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          Archivada
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-3">
                      <dt className="text-slate-500">Raza</dt>
                      <dd className="min-w-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">
                        {displayValue(pet.breed)}
                      </dd>
                    </div>
                    {pet.birth_date ? (
                      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-3">
                        <dt className="text-slate-500">Nacimiento</dt>
                        <dd className="min-w-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">
                          {formatBirthDate(pet.birth_date)}
                        </dd>
                      </div>
                    ) : null}
                    {pet.weight !== null ? (
                      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-3">
                        <dt className="text-slate-500">Peso</dt>
                        <dd className="min-w-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">
                          {pet.weight} kg
                        </dd>
                      </div>
                    ) : null}
                    {pet.current_food ? (
                      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-3">
                        <dt className="text-slate-500">Alimento actual</dt>
                        <dd className="min-w-0 font-semibold text-slate-900 [overflow-wrap:anywhere]">
                          {pet.current_food}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
