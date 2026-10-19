import Image from "next/image";
import Link from "next/link";
import { CartNavLink } from "@/components/cart/CartNavLink";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <Link href="/" className="w-fit shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple">
          <Image
            src="/images/rafapet-logo-horizontal-web.png"
            alt="RafaPet — Inicio"
            width={2048}
            height={665}
            sizes="(min-width: 1024px) 200px, 180px"
            className="h-auto w-[180px] lg:w-[200px]"
          />
        </Link>

        <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-brand-dark [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:rounded-md [&>a]:focus-visible:outline-2 [&>a]:focus-visible:outline-offset-2 [&>a]:focus-visible:outline-brand-purple [&>a]:hover:underline">
          <Link href="/">Inicio</Link>
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/login">Iniciar sesión</Link>
          <Link href="/registro">Crear cuenta</Link>
          <CartNavLink />
        </nav>
      </div>
    </header>
  );
}
