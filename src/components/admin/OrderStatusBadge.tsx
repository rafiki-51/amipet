import type { OrderStatus } from "@/types/order";

const statusStyles: Record<OrderStatus, string> = {
  recibido: "bg-amber-100 text-amber-800",
  preparando: "bg-sky-100 text-sky-800",
  "en-ruta": "bg-emerald-100 text-emerald-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const statusLabels: Record<OrderStatus, string> = {
  recibido: "Recibido",
  preparando: "Preparando",
  "en-ruta": "En ruta",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function getOrderStatusLabel(status: OrderStatus) {
  return statusLabels[status];
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full border border-current/15 px-3 py-1.5 text-center text-xs font-semibold leading-5 [overflow-wrap:anywhere] ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
