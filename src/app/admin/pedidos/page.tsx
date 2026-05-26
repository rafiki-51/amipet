"use client";

import { useEffect, useMemo, useState } from "react";
import { OrderCard } from "@/components/admin/OrderCard";
import { OrderDetail } from "@/components/admin/OrderDetail";
import {
  OrderFilters,
  type OrderFilterState,
} from "@/components/admin/OrderFilters";
import {
  getLocalOrders,
  type LocalOrder,
  updateLocalOrderStatus,
} from "@/lib/localOrders";
import type { OrderStatus } from "@/types/order";

const initialFilters: OrderFilterState = {
  status: "todos",
  district: "todas",
  paymentMethod: "todos",
};

function sortOrdersByNewest(orders: LocalOrder[]) {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFilters] = useState<OrderFilterState>(initialFilters);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedOrders = sortOrdersByNewest(getLocalOrders());
      setOrders(storedOrders);
      setSelectedOrderId(storedOrders[0]?.id ?? null);
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        filters.status === "todos" || order.status === filters.status;
      const matchesDistrict =
        filters.district === "todas" ||
        order.customer.district === filters.district;
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

  function handleStatusChange(orderId: string, status: OrderStatus) {
    const updatedOrders = sortOrdersByNewest(
      updateLocalOrderStatus(orderId, status),
    );
    setOrders(updatedOrders);
    setSelectedOrderId(orderId);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Panel administrativo local
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Prototipo operativo local. Los pedidos se leen desde
              localStorage y no están protegidos por login todavía.
            </p>
          </div>
          <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
            MVP local
          </div>
        </div>

        {!isHydrated ? (
          <p className="mt-8 text-slate-600">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No hay pedidos todavía
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cuando un cliente confirme un pedido en el checkout, aparecerá en
              este panel local.
            </p>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <OrderFilters
                filters={filters}
                onChange={handleFiltersChange}
              />

              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>
                  {filteredOrders.length} de {orders.length} pedidos
                </span>
                <span>Más recientes primero</span>
              </div>

              {filteredOrders.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <h2 className="font-semibold text-slate-900">
                    Sin resultados
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Ajustá los filtros para ver otros pedidos.
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
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <h2 className="font-semibold text-slate-900">
                    Seleccioná un pedido
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Elegí un pedido de la lista para ver el detalle.
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
