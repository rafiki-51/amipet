import {
  getOrderStatusLabel,
  OrderStatusBadge,
} from "@/components/admin/OrderStatusBadge";
import { orderStatuses } from "@/config/orders";
import { paymentMethods } from "@/config/payment";
import { paymentStatusLabels } from "@/config/payment-status";
import { formatCurrency } from "@/lib/format";
import type { AdminOrder } from "@/types/admin-order";
import type { OrderStatus } from "@/types/order";

type OrderDetailProps = {
  order: AdminOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  isUpdatingStatus: boolean;
};

export function OrderDetail({
  order,
  onStatusChange,
  isUpdatingStatus,
}: OrderDetailProps) {
  const paymentMethod = paymentMethods.find(
    (method) => method.id === order.paymentMethod,
  );
  const createdAt = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

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
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">
            Cambiar estado
          </span>
          <select
            value={order.status}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              onStatusChange(order.id, event.target.value as OrderStatus)
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
          >
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {getOrderStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={order.status === "entregado" || isUpdatingStatus}
          onClick={() => onStatusChange(order.id, "entregado")}
          className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isUpdatingStatus ? "Actualizando..." : "Marcar como entregado"}
        </button>
      </div>
    </section>
  );
}
