"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartNavLink() {
  const { isHydrated, totalItems } = useCart();

  return (
    <Link href="/carrito" className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap">
      Carrito
      {isHydrated && totalItems > 0 ? (
        <span className="rounded-full bg-brand-dark px-2 py-0.5 text-xs font-semibold text-white">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
