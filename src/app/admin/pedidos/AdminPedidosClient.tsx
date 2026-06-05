"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { OrderCard } from "@/components/admin/OrderCard";
import { OrderDetail } from "@/components/admin/OrderDetail";
import {
  OrderFilters,
  type OrderFilterState,
} from "@/components/admin/OrderFilters";
import { orderStatuses } from "@/config/orders";
import type { AdminOrder } from "@/types/admin-order";
import type { OrderStatus } from "@/types/order";

type AdminOrdersResponse = {
  orders?: AdminOrder[];
  error?: string;
};

type StatusUpdateResponse = {
  orderId?: string;
  status?: unknown;
  updatedAt?: string | null;
  error?: string;
};

const initialFilters = {
  status: "todos",
  district: "todas",
  paymentMethod: "todos",
} satisfies OrderFilterState;

const validStatuses = new Set<string>(orderStatuses);

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && validStatuses.has(value);
}

function sortOrdersByNewest(orders: AdminOrder[]) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function AdminPedidosClient() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilterState>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const payload = (await response.json()) as AdminOrdersResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron cargar los pedidos.");
      }

      const nextOrders = sortOrdersByNewest(payload.orders ?? []);
      setOrders(nextOrders);
      setSelectedOrderId((currentId) => {
        if (currentId && nextOrders.some((order) => order.id === currentId)) {
          return currentId;
        }

        return nextOrders[0]?.id ?? null;
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError("No se pudieron cargar los pedidos. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const zones = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.delivery.zoneName).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "es-CR"),
      ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        filters.status === "todos" || order.status === filters.status;
      const matchesDistrict =
        filters.district === "todas" || order.delivery.zoneName === filters.district;
      const matchesPayment =
        filters.paymentMethod === "todos" ||
        order.paymentMethod === filters.paymentMethod;

      return matchesStatus && matchesDistrict && matchesPayment;
    });
  }, [filters, orders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return filteredOrders[0] ?? null;
    }

    return (
      filteredOrders.find((order) => order.id === selectedOrderId) ??
      orders.find((order) => order.id === selectedOrderId) ??
      null
    );
  }, [filteredOrders, orders, selectedOrderId]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingStatus(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json()) as StatusUpdateResponse;

      if (!response.ok || !payload.orderId || !isOrderStatus(payload.status)) {
        throw new Error(payload.error ?? "No se pudo actualizar el estado.");
      }

      const updatedStatus = payload.status;

      setOrders((currentOrders) =>
        sortOrdersByNewest(
          currentOrders.map((order) =>
            order.id === payload.orderId
              ? {
                  ...order,
                  status: updatedStatus,
                  updatedAt: payload.updatedAt ?? order.updatedAt,
                }
              : order,
          ),
        ),
      );
      setSelectedOrderId(orderId);
    } catch (statusError) {
      console.error(statusError);
      setError("No se pudo actualizar el estado del pedido.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totalOrders = orders.length;
  const receivedOrders = orders.filter((order) => order.status === "recibido").length;
  const preparingOrders = orders.filter((order) => order.status === "preparando").length;
  const deliveredOrders = orders.filter((order) => order.status === "entregado").length;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Admin Amipet
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Gestion de pedidos
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Panel protegido para administradores y operadores.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
            >
              Actualizar
            </button>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{totalOrders}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Pendientes
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-800">{receivedOrders}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Preparando
              </p>
              <p className="mt-2 text-2xl font-bold text-sky-800">{preparingOrders}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Entregados
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">{deliveredOrders}</p>
            </div>
          </div>

          <OrderFilters filters={filters} zones={zones} onChange={setFilters} />

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Cargando pedidos...
              </div>
            ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onSelect={setSelectedOrderId}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No hay pedidos que coincidan con los filtros actuales.
              </div>
            )}
          </div>
        </div>

        {selectedOrder ? (
          <OrderDetail
            order={selectedOrder}
            onStatusChange={handleStatusChange}
            isUpdatingStatus={updatingStatus}
          />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Selecciona un pedido para ver el detalle.
          </section>
        )}
      </section>
    </main>
  );
}
