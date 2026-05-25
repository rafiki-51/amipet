"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/types/product";

const cartStorageKey = "amipet-cart";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(quantity: number, stock: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(quantity), 1), stock);
}

function readStoredCart() {
  try {
    const storedCart = window.localStorage.getItem(cartStorageKey);

    if (!storedCart) {
      return [];
    }

    const parsed = JSON.parse(storedCart);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item === "object" &&
        typeof item.quantity === "number" &&
        item.product &&
        typeof item.product.id === "string",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setItems(readStoredCart());
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
    } catch {
      // Keep the in-memory cart working if storage is unavailable.
    }
  }, [isHydrated, items]);

  const addItem = useCallback((product: Product) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            product,
            quantity: normalizeQuantity(1, product.stock),
          },
        ];
      }

      return currentItems.map((item) =>
        item.product.id === product.id
          ? {
              ...item,
              product,
              quantity: normalizeQuantity(item.quantity + 1, product.stock),
            }
          : item,
      );
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: normalizeQuantity(quantity, item.product.stock),
            }
          : item,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.product.id !== productId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );

    return {
      items,
      totalItems,
      subtotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [addItem, clearCart, isHydrated, items, removeItem, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
