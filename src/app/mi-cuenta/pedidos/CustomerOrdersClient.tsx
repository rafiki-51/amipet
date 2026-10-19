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
        title="Tu sesión finalizó."
        description="Iniciá sesión para consultar los pedidos vinculados a tu cuenta."
        action={
          <Link
            href="/login?redirect=/mi-cuenta/pedidos"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Iniciar sesión
          </Link>
        }
      />
    );
  }

  if (viewState === "forbidden") {
    return (
      <MessageState
        title="No tenés acceso a esta sección."
        description="Mis Pedidos está disponible únicamente para cuentas de cliente."
        action={
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-dark/20 bg-white px-5 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      {orders.map((order) => (
        <CustomerOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrdersLoadingState() {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2" aria-live="polite">
      <p className="sr-only">Cargando pedidos...</p>
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse motion-reduce:animate-none rounded-2xl border border-brand-dark/10 bg-white shadow-sm"
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
    <section className="rounded-2xl border border-brand-dark/10 bg-white px-4 py-10 text-center sm:px-6 sm:py-12 shadow-sm">
      <h2 className="break-words text-xl font-bold tracking-tight text-brand-dark">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <div className="mt-6">{action}</div>
    </section>
  );
}
