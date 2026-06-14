import Link from "next/link";
import { CustomerOrderStatusBadge } from "@/components/account/orders/CustomerOrderStatusBadge";
import { CustomerPaymentStatusBadge } from "@/components/account/orders/CustomerPaymentStatusBadge";
import { formatCurrency } from "@/lib/format";
import type { CustomerOrderSummary } from "@/types/customer-order";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerOrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">
            Pedido
          </p>
          <h2 className="mt-2 break-words text-xl font-bold text-slate-950">
            {order.orderNumber}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <CustomerOrderStatusBadge status={order.status} />
          <CustomerPaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">
          {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {order.itemsPreview.map((item, index) => (
            <li
              key={`${item.productName}-${index}`}
              className="flex justify-between gap-4"
            >
              <span>{item.productName}</span>
              <span className="font-medium text-slate-900">
                x{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-bold text-slate-950">
          {formatCurrency(order.total)}
        </p>
        <Link
          href={`/mi-cuenta/pedidos/${order.id}`}
          className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
