"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";

type AddToCartButtonProps = {
  product: Product;
  label?: string;
  className?: string;
};

export function AddToCartButton({
  product,
  label = "Agregar",
  className,
}: AddToCartButtonProps) {
  const { addItem, items } = useCart();
  const [wasAdded, setWasAdded] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const isOutOfStock = product.stock <= 0;
  const currentQuantity =
    items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const hasReachedMaxStock = product.stock > 0 && currentQuantity >= product.stock;

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleAddToCart() {
    if (hasReachedMaxStock) {
      setWasAdded(false);
      return;
    }

    addItem(product);
    setWasAdded(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setWasAdded(false);
      timeoutRef.current = null;
    }, 1200);
  }

  return (
    <button
      type="button"
      className={className}
      disabled={isOutOfStock}
      onClick={handleAddToCart}
    >
      {isOutOfStock
        ? "Sin stock"
        : hasReachedMaxStock
          ? "Stock máximo"
          : wasAdded
            ? "Agregado"
            : label}
    </button>
  );
}
