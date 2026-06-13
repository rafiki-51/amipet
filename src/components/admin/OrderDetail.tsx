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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Detalle del pedido
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{createdAt}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Cliente</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Nombre:</span>{" "}
              {order.customer.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Telefono:</span>{" "}
              {order.customer.phone}
            </p>
            <p>
              <span className="font-medium text-slate-900">Zona:</span>{" "}
              {order.delivery.zoneName}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Entrega</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Direccion:</span>{" "}
              {order.delivery.address}
            </p>
            <p>
              <span className="font-medium text-slate-900">Referencias:</span>{" "}
              {order.delivery.references || "Sin referencias"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Productos</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {item.productName}
                </p>
                <p className="mt-1 text-slate-500">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <p className="font-semibold text-slate-900">
                {formatCurrency(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Pago y notas</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Metodo:</span>{" "}
              {paymentMethod?.label || order.paymentMethod}
            </p>
            <p>
              <span className="font-medium text-slate-900">Estado:</span>{" "}
              {paymentStatusLabels[order.paymentStatus]}
            </p>
            {order.paymentStatus === "paid" ? (
              <>
                <p>
                  <span className="font-medium text-slate-900">
                    Confirmado:
                  </span>{" "}
                  {paidAt || "Sin fecha registrada"}
                </p>
                <p className="break-all">
                  <span className="font-medium text-slate-900">
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
                className="mt-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isUpdatingPayment ? "Confirmando pago..." : "Confirmar pago"}
              </button>
            ) : null}
            <p>
              <span className="font-medium text-slate-900">Notas:</span>{" "}
              {order.notes || "Sin notas"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Notas admin:</span>{" "}
              {order.adminNotes || "Sin notas"}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Totales</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Delivery</span>
              <span className="font-medium text-emerald-700">
                {order.deliveryFee === 0
                  ? "Gratis"
                  : formatCurrency(order.deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-base">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">
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
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
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
                  className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
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
