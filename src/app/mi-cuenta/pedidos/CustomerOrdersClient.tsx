"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerOrderCard } from "@/components/account/orders/CustomerOrderCard";
import { CustomerOrdersEmptyState } from "@/components/account/orders/CustomerOrdersEmptyState";
import type { CustomerOrderSummary } from "@/types/customer-order";

type OrdersResponse = {
  orders?: CustomerOrderSummary[];
};

type ViewState =
  | "loading"
  | "ready"
  | "unauthenticated"
  | "forbidden"
  | "error";

type OrdersLoadResult = {
  orders: CustomerOrderSummary[];
  viewState: Exclude<ViewState, "loading">;
};

async function requestOrders(): Promise<OrdersLoadResult> {
  try {
    const response = await fetch("/api/account/orders", {
      cache: "no-store",
    });

    if (response.status === 401) {
      return { orders: [], viewState: "unauthenticated" };
    }

    if (response.status === 403) {
      return { orders: [], viewState: "forbidden" };
    }

    if (!response.ok) {
      return { orders: [], viewState: "error" };
    }

    const payload = (await response.json()) as OrdersResponse;

    return {
      orders: Array.isArray(payload.orders) ? payload.orders : [],
      viewState: "ready",
    };
  } catch {
    return { orders: [], viewState: "error" };
  }
}

export function CustomerOrdersClient() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    void requestOrders().then((result) => {
      if (!isActive) {
        return;
      }

      setOrders(result.orders);
      setViewState(result.viewState);
    });

    return () => {
      isActive = false;
    };
  }, [requestKey]);

  if (viewState === "loading") {
    return <OrdersLoadingState />;
  }

  if (viewState === "unauthenticated") {
    return (
      <MessageState
        title="Tu sesion finalizo."
        description="Inicia sesion para consultar los pedidos vinculados a tu cuenta."
        action={
          <Link
            href="/login?redirect=/mi-cuenta/pedidos"
            className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Iniciar sesion
          </Link>
        }
      />
    );
  }

  if (viewState === "forbidden") {
    return (
      <MessageState
        title="No tenes acceso a esta seccion."
        description="Mis Pedidos esta disponible unicamente para cuentas de cliente."
        action={
          <Link
            href="/"
            className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Volver al inicio
          </Link>
        }
      />
    );
  }

  if (viewState === "error") {
    return (
      <MessageState
        title="No pudimos cargar tus pedidos."
        description="Intenta nuevamente en unos minutos."
        action={
          <button
            type="button"
            onClick={() => {
              setViewState("loading");
              setRequestKey((current) => current + 1);
            }}
            className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Reintentar
          </button>
        }
      />
    );
  }

  if (orders.length === 0) {
    return <CustomerOrdersEmptyState />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {orders.map((order) => (
        <CustomerOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrdersLoadingState() {
  return (
    <div className="grid gap-5 lg:grid-cols-2" aria-live="polite">
      <p className="sr-only">Cargando pedidos...</p>
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      ))}
    </div>
  );
}

function MessageState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <div className="mt-6">{action}</div>
    </section>
  );
}
