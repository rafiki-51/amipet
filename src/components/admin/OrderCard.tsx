import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { formatCurrency } from "@/lib/format";
import type { AdminOrder } from "@/types/admin-order";

type OrderCardProps = {
  order: AdminOrder;
  isSelected: boolean;
  onSelect: (orderId: string) => void;
};

export function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  const createdAt = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

  const totalProducts = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={`w-full min-w-0 rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 ${
        isSelected
          ? "border-brand-dark bg-brand-light"
          : "border-brand-dark/10 bg-white hover:border-brand-dark/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-dark [overflow-wrap:anywhere]">
            {order.orderNumber}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">
            {order.customer.name}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid min-w-0 gap-1 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
        <p>{order.delivery.zoneName}</p>
        <p>{createdAt}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-brand-dark/10 pt-4">
        <span className="text-sm text-slate-500">
          {totalProducts} productos
        </span>
        <span className="min-w-0 font-bold tabular-nums text-brand-dark [overflow-wrap:anywhere]">
          {formatCurrency(order.total)}
        </span>
      </div>
    </button>
  );
}
