"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderCard } from "@/components/admin/OrderCard";
import { OrderDetail } from "@/components/admin/OrderDetail";
import {
  OrderFilters,
  type OrderFilterState,
} from "@/components/admin/OrderFilters";
import type { AdminOrder } from "@/types/admin-order";
import type { OrderStatus } from "@/types/order";

type AdminOrdersResponse = {
  orders: AdminOrder[];
};

type StatusUpdateResponse = {
  orderId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  updatedAt: string | null;
};

const initialFilters: OrderFilterState = {
  status: "todos",
  district: "todas",
  paymentMethod: "todos",
};

function sortOrdersByNewest(orders: AdminOrder[]) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [filters, setFilters] = useState<OrderFilterState>(initialFilters);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/admin/orders");

      if (!response.ok) {
        throw new Error("Failed to load admin orders");
      }

      const data = (await response.json()) as AdminOrdersResponse;
      const sortedOrders = sortOrdersByNewest(data.orders);

      setOrders(sortedOrders);
      setSelectedOrderId((currentSelectedOrderId) => {
        if (
          currentSelectedOrderId &&
          sortedOrders.some((order) => order.id === currentSelectedOrderId)
        ) {
          return currentSelectedOrderId;
        }

        return sortedOrders[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Failed to load admin orders", error);
      setLoadError("No pudimos cargar los pedidos. Intentalo nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filterZones = useMemo(() => {
    return Array.from(
      new Set(
        orders
          .map((order) => order.delivery.zoneName)
          .filter((zoneName) => zoneName.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        filters.status === "todos" || order.status === filters.status;
      const matchesDistrict =
        filters.district === "todas" ||
        order.delivery.zoneName === filters.district;
      const matchesPayment =
        filters.paymentMethod === "todos" ||
        order.paymentMethod === filters.paymentMethod;

      return matchesStatus && matchesDistrict && matchesPayment;
    });
  }, [filters, orders]);

  const selectedOrder = useMemo(() => {
    return (
      orders.find((order) => order.id === selectedOrderId) ??
      filteredOrders[0] ??
      null
    );
  }, [filteredOrders, orders, selectedOrderId]);

  function handleFiltersChange(nextFilters: OrderFilterState) {
    setFilters(nextFilters);
    setSelectedOrderId(null);
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (isUpdatingStatus) {
      return;
    }

    setIsUpdatingStatus(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      const updatedStatus = (await response.json()) as StatusUpdateResponse;

      setOrders((currentOrders) =>
        sortOrdersByNewest(
          currentOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: updatedStatus.status,
                  updatedAt: updatedStatus.updatedAt ?? order.updatedAt,
                }
              : order,
          ),
        ),
      );
      setSelectedOrderId(orderId);
    } catch (error) {
      console.error("Failed to update order status", error);
      setLoadError("No pudimos actualizar el estado del pedido.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Panel administrativo
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Prototipo operativo conectado a Supabase. Este panel todavia no
              esta protegido por login.
            </p>
          </div>
          <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            MVP sin Auth
          </div>
        </div>

        {loadError ? (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <p className="mt-8 text-slate-600">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No hay pedidos todavia
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cuando un cliente confirme un pedido en el checkout, aparecera en
              este panel.
            </p>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <OrderFilters
                filters={filters}
                zones={filterZones}
                onChange={handleFiltersChange}
              />

              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>
                  {filteredOrders.length} de {orders.length} pedidos
                </span>
                <span>Mas recientes primero</span>
              </div>

              {filteredOrders.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <h2 className="font-semibold text-slate-900">
                    Sin resultados
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Ajusta los filtros para ver otros pedidos.
                  </p>
                </section>
              ) : (
                <section className="space-y-3">
                  {filteredOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isSelected={selectedOrder?.id === order.id}
                      onSelect={setSelectedOrderId}
                    />
                  ))}
                </section>
              )}
            </div>

            <div>
              {selectedOrder ? (
                <OrderDetail
                  order={selectedOrder}
                  isUpdatingStatus={isUpdatingStatus}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <h2 className="font-semibold text-slate-900">
                    Selecciona un pedido
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Elige un pedido de la lista para ver el detalle.
                  </p>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
