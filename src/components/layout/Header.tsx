import Link from "next/link";
import { CartNavLink } from "@/components/cart/CartNavLink";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          Amipet
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link href="/">Inicio</Link>
          <Link href="/catalogo">Catálogo</Link>
          <CartNavLink />
        </nav>
      </div>
    </header>
  );
}
