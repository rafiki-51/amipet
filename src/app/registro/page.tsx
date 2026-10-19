"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function RegistroPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validateForm() {
    if (!fullName.trim()) {
      return "Ingresá tu nombre completo.";
    }

    if (!phone.trim()) {
      return "Ingresá tu teléfono.";
    }

    if (!email.trim()) {
      return "Ingresá tu email.";
    }

    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }

    if (password !== confirmPassword) {
      return "Las contraseñas no coinciden.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });

    if (error || !data.user) {
      setErrorMessage(
        "No pudimos crear tu cuenta. Revisá los datos e intentá de nuevo.",
      );
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      setSuccessMessage("Revisá tu correo para confirmar tu cuenta.");
      setIsSubmitting(false);
      return;
    }

    router.push("/mi-cuenta");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-brand-light px-4 py-10 text-slate-900 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">
          RafaPet
        </p>
        <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-dark">
          Crear cuenta
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Creá tu cuenta para consultar tus pedidos y registrar a tus mascotas.
        </p>

        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">
              Nombre completo
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              autoComplete="name"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">
              Teléfono
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              autoComplete="tel"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
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
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-brand-dark">
              Confirmar contraseña
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          {errorMessage ? (
            <p className="break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="break-words rounded-xl border border-brand-dark/20 bg-brand-light px-4 py-3 text-sm leading-6 text-brand-dark">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 w-full rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
          >
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      </section>
    </main>
  );
}
