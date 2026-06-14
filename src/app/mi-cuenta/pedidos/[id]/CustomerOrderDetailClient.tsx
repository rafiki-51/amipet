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
        title="Tu sesion finalizo."
        description="Inicia sesion para consultar este pedido."
        actionHref={`/login?redirect=${redirectPath}`}
        actionLabel="Iniciar sesion"
      />
    );
  }

  if (viewState === "forbidden") {
    return (
      <MessageState
        title="No tenes acceso a esta seccion."
        description="Mis Pedidos esta disponible unicamente para cuentas de cliente."
        actionHref="/"
        actionLabel="Volver al inicio"
      />
    );
  }

  if (viewState === "invalid") {
    return (
      <MessageState
        title="El identificador del pedido no es valido."
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
        description="Es posible que el pedido no exista o no este vinculado a tu cuenta."
        actionHref="/mi-cuenta/pedidos"
        actionLabel="Volver a mis pedidos"
      />
    );
  }

  if (viewState === "error" || !order) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-950">
          No pudimos cargar este pedido.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Intenta nuevamente en unos minutos.
        </p>
        <button
          type="button"
          onClick={() => {
            setViewState("loading");
            setRequestKey((current) => current + 1);
          }}
          className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
      className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
      aria-live="polite"
    >
      <p className="sr-only">Cargando pedido...</p>
      <div className="space-y-5">
        <div className="h-44 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      </div>
      <div className="space-y-5">
        <div className="h-64 rounded-2xl border border-slate-200 bg-white shadow-sm" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white shadow-sm" />
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
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
