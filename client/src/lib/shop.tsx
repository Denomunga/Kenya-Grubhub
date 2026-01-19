import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@/lib/data";

export type CartLine = { item: MenuItem; quantity: number };

type ShopContextType = {
  cart: CartLine[];
  wishlist: Set<string>;
  compare: Set<string>;

  addToCart: (item: MenuItem, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  setCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  toggleWishlist: (itemId: string) => void;
  clearWishlist: () => void;

  toggleCompare: (itemId: string) => void;
  clearCompare: () => void;
};

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const STORAGE_KEYS = {
  cart: "shop_cart",
  wishlist: "shop_wishlist",
  compare: "shop_compare",
} as const;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getStepDecimals(step: number) {
  const s = String(step);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

function normalizeToStep(value: number, step: number) {
  if (!step || step <= 0) return value;
  const decimals = getStepDecimals(step);
  const normalized = Math.round(value / step) * step;
  return Number(normalized.toFixed(decimals));
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(() => new Set());
  const [compare, setCompare] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const storedCart = safeJsonParse<CartLine[]>(localStorage.getItem(STORAGE_KEYS.cart));
    if (Array.isArray(storedCart)) setCart(storedCart);

    const storedWishlist = safeJsonParse<string[]>(localStorage.getItem(STORAGE_KEYS.wishlist));
    if (Array.isArray(storedWishlist)) setWishlist(new Set(storedWishlist));

    const storedCompare = safeJsonParse<string[]>(localStorage.getItem(STORAGE_KEYS.compare));
    if (Array.isArray(storedCompare)) setCompare(new Set(storedCompare));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(Array.from(wishlist)));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.compare, JSON.stringify(Array.from(compare)));
  }, [compare]);

  const value = useMemo<ShopContextType>(() => {
    return {
      cart,
      wishlist,
      compare,

      addToCart: (item, quantity = 1) => {
        const step = item.quantityStep || 1;
        const qty = normalizeToStep(quantity, step);

        setCart((prev) => {
          const existing = prev.find((i) => i.item.id === item.id);
          if (existing) {
            const nextQty = normalizeToStep(existing.quantity + qty, step);
            return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: nextQty } : i));
          }
          return [...prev, { item, quantity: qty }];
        });
      },

      removeFromCart: (itemId) => {
        setCart((prev) => prev.filter((i) => i.item.id !== itemId));
      },

      setCartItemQuantity: (itemId, quantity) => {
        setCart((prev) => {
          const existing = prev.find((i) => i.item.id === itemId);
          if (!existing) return prev;

          const step = existing.item.quantityStep || 1;
          const nextQty = normalizeToStep(quantity, step);

          if (nextQty <= 0) return prev.filter((i) => i.item.id !== itemId);

          return prev.map((i) => (i.item.id === itemId ? { ...i, quantity: nextQty } : i));
        });
      },

      clearCart: () => {
        setCart([]);
      },

      toggleWishlist: (itemId) => {
        setWishlist((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      },

      clearWishlist: () => {
        setWishlist(new Set());
      },

      toggleCompare: (itemId) => {
        setCompare((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
      },

      clearCompare: () => {
        setCompare(new Set());
      },
    };
  }, [cart, wishlist, compare]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within a ShopProvider");
  return ctx;
}
