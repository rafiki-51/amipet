import type { OrderStatus } from "@/types/order";

const statusLabels: Record<OrderStatus, string> = {
  recibido: "Recibido",
  preparando: "Preparando",
  "en-ruta": "En ruta",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const statusStyles: Record<OrderStatus, string> = {
  recibido: "bg-amber-100 text-amber-800",
  preparando: "bg-sky-100 text-sky-800",
  "en-ruta": "bg-emerald-100 text-emerald-800",
  entregado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export function getCustomerOrderStatusLabel(status: OrderStatus) {
  return statusLabels[status];
}

export function CustomerOrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
