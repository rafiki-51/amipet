import { formatCurrency } from "@/lib/format";
import type { LocalOrder } from "@/lib/localOrders";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

type OrderCardProps = {
  order: LocalOrder;
  isSelected: boolean;
  onSelect: (orderId: string) => void;
};

export function OrderCard({ order, isSelected, onSelect }: OrderCardProps) {
  const createdAt = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-emerald-400 bg-emerald-50"
          : "border-slate-200 bg-white hover:border-emerald-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{order.id}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {order.customer.name}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid gap-1 text-sm text-slate-600">
        <p>{order.customer.district}</p>
        <p>{createdAt}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="text-sm text-slate-500">
          {order.items.reduce((total, item) => total + item.quantity, 0)} productos
        </span>
        <span className="font-bold text-slate-900">
          {formatCurrency(order.total)}
        </span>
      </div>
    </button>
  );
}
