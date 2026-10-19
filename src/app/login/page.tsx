"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { isAdminRole, isCustomerRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      setErrorMessage("Correo o contraseña inválidos.");
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      setErrorMessage("No pudimos validar tu perfil. Intentalo nuevamente.");
      setIsSubmitting(false);
      return;
    }

    if (isCustomerRole(profile.role)) {
      router.push("/mi-cuenta");
      router.refresh();
      return;
    }

    if (isAdminRole(profile.role)) {
      router.push("/admin/pedidos");
      router.refresh();
      return;
    }

    setErrorMessage("Tu cuenta no tiene un rol válido.");
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-brand-light px-4 py-10 text-slate-900 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">
          RafaPet
        </p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-dark">
          Iniciar sesión
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Ingresá para consultar tus pedidos y el expediente de tus mascotas.
        </p>

        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">
              Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? (
            <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="inline-flex min-h-11 items-center rounded-md font-semibold text-brand-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple">
            Crear cuenta
          </Link>
        </p>
      </section>
    </main>
  );
}
