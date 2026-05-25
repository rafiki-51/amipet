"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartNavLink() {
  const { isHydrated, totalItems } = useCart();

  return (
    <Link href="/carrito" className="inline-flex items-center gap-1">
      Carrito
      {isHydrated && totalItems > 0 ? (
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
          {totalItems}
        </span>
      ) : null}
    </Link>
  );
}
