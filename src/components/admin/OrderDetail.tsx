import { useState } from "react";

import {
  getOrderStatusLabel,
  OrderStatusBadge,
} from "@/components/admin/OrderStatusBadge";
import { paymentMethods } from "@/config/payment";
import { paymentStatusLabels } from "@/config/payment-status";
import { formatCurrency } from "@/lib/format";
import type { AdminOrder } from "@/types/admin-order";
import type { OrderStatus } from "@/types/order";

type OrderDetailProps = {
  order: AdminOrder;
  onStatusChange: (
    orderId: string,
    status: OrderStatus,
    cancellationReason?: string,
  ) => void;
  onPaymentConfirm: (orderId: string) => void;
  isUpdatingStatus: boolean;
  isUpdatingPayment: boolean;
};

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  recibido: ["preparando", "cancelado"],
  preparando: ["en-ruta", "cancelado"],
  "en-ruta": ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

export function OrderDetail({
  order,
  onStatusChange,
  onPaymentConfirm,
  isUpdatingStatus,
  isUpdatingPayment,
}: OrderDetailProps) {
  const [cancellationInput, setCancellationInput] = useState({
    orderId: order.id,
    value: "",
  });
  const cancellationReason =
    cancellationInput.orderId === order.id ? cancellationInput.value : "";
  const paymentMethod = paymentMethods.find(
    (method) => method.id === order.paymentMethod,
  );
  const availableTransitions = allowedTransitions[order.status].filter(
    (status) =>
      (status !== "cancelado" || order.paymentStatus !== "paid") &&
      (status !== "entregado" || order.paymentStatus === "paid"),
  );
  const isTerminal = availableTransitions.length === 0;
  const canConfirmPayment =
    order.paymentStatus === "pending" && order.status !== "cancelado";
  const deliveryRequiresPayment =
    order.status === "en-ruta" && order.paymentStatus !== "paid";
  const createdAt = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(order.createdAt));
  const paidAt = order.paidAt
    ? new Intl.DateTimeFormat("es-CR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.paidAt))
    : null;

  function requestStatusChange(nextStatus: OrderStatus) {
    if (nextStatus !== "cancelado") {
      onStatusChange(order.id, nextStatus);
      return;
    }

    const trimmedReason = cancellationReason.trim();

    if (
      !trimmedReason ||
      !window.confirm(
        "¿Confirmás la cancelación? El stock elegible será restaurado.",
      )
    ) {
      return;
    }

    onStatusChange(order.id, nextStatus, trimmedReason);
  }

  function requestPaymentConfirmation() {
    if (
      !canConfirmPayment ||
      !window.confirm(
        "¿Confirmás que el pago fue recibido? Esta acción no se puede revertir.",
      )
    ) {
      return;
    }

    onPaymentConfirm(order.id);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-dark">
            Detalle del pedido
          </p>
          <h2 className="mt-2 text-2xl font-bold text-brand-dark [overflow-wrap:anywhere]">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{createdAt}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-brand-light/50 p-4">
          <h3 className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Cliente</h3>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Nombre:</span>{" "}
              {order.customer.name}
            </p>
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Teléfono:</span>{" "}
              {order.customer.phone}
            </p>
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Zona:</span>{" "}
              {order.delivery.zoneName}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-brand-light/50 p-4">
          <h3 className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Entrega</h3>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Dirección:</span>{" "}
              {order.delivery.address}
            </p>
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Referencias:</span>{" "}
              {order.delivery.references || "Sin referencias"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-brand-dark/10">
        <div className="border-b border-brand-dark/10 px-4 py-3">
          <h3 className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Productos</h3>
        </div>
        <div className="divide-y divide-brand-dark/10">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="grid min-w-0 gap-3 px-4 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)]"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                  {item.productName}
                </p>
                <p className="mt-1 text-slate-600 [overflow-wrap:anywhere]">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {formatCurrency(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-brand-light/50 p-4">
          <h3 className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Pago y notas</h3>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Método:</span>{" "}
              {paymentMethod?.label || order.paymentMethod}
            </p>
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Estado:</span>{" "}
              {paymentStatusLabels[order.paymentStatus]}
            </p>
            {order.paymentStatus === "paid" ? (
              <>
                <p>
                  <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                    Confirmado:
                  </span>{" "}
                  {paidAt || "Sin fecha registrada"}
                </p>
                <p className="break-all">
                  <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                    Confirmado por:
                  </span>{" "}
                  {order.paymentConfirmedBy || "Sin usuario registrado"}
                </p>
              </>
            ) : null}
            {canConfirmPayment ? (
              <button
                type="button"
                disabled={isUpdatingPayment || isUpdatingStatus}
                onClick={requestPaymentConfirmation}
                className="mt-2 min-h-11 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
              >
                {isUpdatingPayment ? "Confirmando pago..." : "Confirmar pago"}
              </button>
            ) : null}
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Notas:</span>{" "}
              {order.notes || "Sin notas"}
            </p>
            <p>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">Notas admin:</span>{" "}
              {order.adminNotes || "Sin notas"}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-brand-dark/5 bg-brand-light/50 p-4">
          <h3 className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Totales</h3>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <span>Entrega</span>
              <span className="font-medium text-emerald-700">
                {order.deliveryFee === 0
                  ? "Gratis"
                  : formatCurrency(order.deliveryFee)}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-brand-dark/10 pt-2 text-base">
              <span className="font-semibold text-brand-dark [overflow-wrap:anywhere]">Total</span>
              <span className="font-bold tabular-nums text-brand-dark [overflow-wrap:anywhere]">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-brand-dark/10 p-4">
        <h3 className="text-sm font-semibold text-brand-dark">
          Cambiar estado
        </h3>

        {deliveryRequiresPayment ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Confirmá el pago antes de marcar el pedido como entregado.
          </p>
        ) : null}

        {isTerminal ? (
          <p className="mt-2 text-sm text-slate-600">
            Este pedido está en un estado terminal y no permite más cambios.
          </p>
        ) : (
          <>
            {availableTransitions.includes("cancelado") ? (
              <label className="mt-3 block">
                <span className="text-sm font-medium text-slate-700">
                  Motivo de cancelación
                </span>
                <textarea
                  value={cancellationReason}
                  disabled={isUpdatingStatus}
                  onChange={(event) =>
                    setCancellationInput({
                      orderId: order.id,
                      value: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Motivo obligatorio para cancelar"
                  className="mt-2 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {availableTransitions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  disabled={
                    isUpdatingStatus ||
                    (nextStatus === "cancelado" &&
                      cancellationReason.trim().length === 0)
                  }
                  onClick={() => requestStatusChange(nextStatus)}
                  className={`min-h-11 rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 ${
                    nextStatus === "cancelado"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isUpdatingStatus
                    ? "Actualizando..."
                    : nextStatus === "cancelado"
                      ? "Cancelar pedido"
                      : `Marcar como ${getOrderStatusLabel(nextStatus).toLowerCase()}`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
