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
    <article className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">
            Pedido
          </p>
          <h2 className="mt-2 [overflow-wrap:anywhere] text-xl font-bold text-brand-dark">
            {order.orderNumber}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[50%] sm:justify-end">
          <CustomerOrderStatusBadge status={order.status} />
          <CustomerPaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-brand-dark/5 bg-brand-light p-4">
        <p className="text-sm font-semibold text-slate-900">
          {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {order.itemsPreview.map((item, index) => (
            <li
              key={`${item.productName}-${index}`}
              className="flex min-w-0 justify-between gap-4"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{item.productName}</span>
              <span className="shrink-0 font-medium text-slate-900">
                x{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-brand-dark/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 [overflow-wrap:anywhere] text-lg font-bold tabular-nums text-brand-dark">
          {formatCurrency(order.total)}
        </p>
        <Link
          href={`/mi-cuenta/pedidos/${order.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
