"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerOrderDetail } from "@/components/account/orders/CustomerOrderDetail";
import type { CustomerOrderDetail as CustomerOrderDetailType } from "@/types/customer-order";

type OrderResponse = {
  order?: CustomerOrderDetailType;
};

type ViewState =
  | "loading"
  | "ready"
  | "invalid"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "error";

type OrderLoadResult = {
  order: CustomerOrderDetailType | null;
  viewState: Exclude<ViewState, "loading">;
};

async function requestOrder(orderId: string): Promise<OrderLoadResult> {
  try {
    const response = await fetch(
      `/api/account/orders/${encodeURIComponent(orderId)}`,
      { cache: "no-store" },
    );

    if (response.status === 400) {
      return { order: null, viewState: "invalid" };
    }

    if (response.status === 401) {
      return { order: null, viewState: "unauthenticated" };
    }

    if (response.status === 403) {
      return { order: null, viewState: "forbidden" };
    }

    if (response.status === 404) {
      return { order: null, viewState: "not-found" };
    }

    if (!response.ok) {
      return { order: null, viewState: "error" };
    }

    const payload = (await response.json()) as OrderResponse;

    if (!payload.order) {
      return { order: null, viewState: "error" };
    }

    return { order: payload.order, viewState: "ready" };
  } catch {
    return { order: null, viewState: "error" };
  }
}

export function CustomerOrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<CustomerOrderDetailType | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    void requestOrder(orderId).then((result) => {
      if (!isActive) {
        return;
      }

      setOrder(result.order);
      setViewState(result.viewState);
    });

    return () => {
      isActive = false;
    };
  }, [orderId, requestKey]);

  if (viewState === "loading") {
    return <DetailLoadingState />;
  }

  if (viewState === "unauthenticated") {
    const redirectPath = encodeURIComponent(`/mi-cuenta/pedidos/${orderId}`);

    return (
      <MessageState
        title="Tu sesión finalizó."
        description="Iniciá sesión para consultar este pedido."
        actionHref={`/login?redirect=${redirectPath}`}
        actionLabel="Iniciar sesión"
      />
    );
  }

  if (viewState === "forbidden") {
    return (
      <MessageState
        title="No tenés acceso a esta sección."
        description="Mis Pedidos está disponible únicamente para cuentas de cliente."
        actionHref="/"
        actionLabel="Volver al inicio"
      />
    );
  }

  if (viewState === "invalid") {
    return (
      <MessageState
        title="El identificador del pedido no es válido."
        description="Volver a Mis Pedidos es la forma segura de consultar un pedido."
        actionHref="/mi-cuenta/pedidos"
        actionLabel="Volver a mis pedidos"
      />
    );
  }

  if (viewState === "not-found") {
    return (
      <MessageState
        title="No pudimos encontrar este pedido."
        description="Es posible que el pedido no exista o no esté vinculado a tu cuenta."
        actionHref="/mi-cuenta/pedidos"
        actionLabel="Volver a mis pedidos"
      />
    );
  }

  if (viewState === "error" || !order) {
    return (
      <section className="rounded-2xl border border-brand-dark/10 bg-white px-4 py-10 text-center sm:px-6 sm:py-12 shadow-sm">
        <h2 className="break-words text-xl font-bold tracking-tight text-brand-dark">
          No pudimos cargar este pedido.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Intentá nuevamente en unos minutos.
        </p>
        <button
          type="button"
          onClick={() => {
            setViewState("loading");
            setRequestKey((current) => current + 1);
          }}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      </section>
    );
  }

  return <CustomerOrderDetail order={order} />;
}

function DetailLoadingState() {
  return (
    <div
      className="grid min-w-0 animate-pulse gap-5 motion-reduce:animate-none lg:grid-cols-[minmax(0,1fr)_340px]"
      aria-live="polite"
    >
      <p className="sr-only">Cargando pedido...</p>
      <div className="min-w-0 space-y-5">
        <div className="h-44 rounded-2xl border border-brand-dark/10 bg-white shadow-sm" />
        <div className="h-80 rounded-2xl border border-brand-dark/10 bg-white shadow-sm" />
        <div className="h-64 rounded-2xl border border-brand-dark/10 bg-white shadow-sm" />
      </div>
      <div className="min-w-0 space-y-5">
        <div className="h-64 rounded-2xl border border-brand-dark/10 bg-white shadow-sm" />
        <div className="h-72 rounded-2xl border border-brand-dark/10 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function MessageState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-brand-dark/10 bg-white px-4 py-10 text-center sm:px-6 sm:py-12 shadow-sm">
      <h2 className="break-words text-xl font-bold tracking-tight text-brand-dark">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
