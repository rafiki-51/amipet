import { CustomerOrderStatusBadge } from "@/components/account/orders/CustomerOrderStatusBadge";
import { CustomerOrderTimeline } from "@/components/account/orders/CustomerOrderTimeline";
import { CustomerPaymentStatusBadge } from "@/components/account/orders/CustomerPaymentStatusBadge";
import { paymentMethods } from "@/config/payment";
import { formatCurrency } from "@/lib/format";
import type { CustomerOrderDetail as CustomerOrderDetailType } from "@/types/customer-order";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerOrderDetail({
  order,
}: {
  order: CustomerOrderDetailType;
}) {
  const paymentMethod = paymentMethods.find(
    (method) => method.id === order.paymentMethod,
  );

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-dark">
                Pedido
              </p>
              <h1 className="mt-2 [overflow-wrap:anywhere] text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[50%] sm:justify-end">
              <CustomerOrderStatusBadge status={order.status} />
              <CustomerPaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-brand-dark">
            Productos
          </h2>
          <div className="mt-5 divide-y divide-brand-dark/10">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand-dark [overflow-wrap:anywhere]">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-bold tabular-nums text-brand-dark [overflow-wrap:anywhere]">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-brand-dark">
            Entrega
          </h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="font-medium text-slate-500">Zona</dt>
              <dd className="mt-1 font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {order.delivery.zoneName || "Sin zona registrada"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-slate-500">Dirección</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {order.delivery.address || "Sin dirección registrada"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-slate-500">Referencias</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {order.delivery.references || "Sin referencias"}
              </dd>
            </div>
          </dl>
        </section>

        {order.notes ? (
          <section className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-brand-dark">
              Notas del pedido
            </h2>
            <p className="mt-4 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-6 text-slate-600">
              {order.notes}
            </p>
          </section>
        ) : null}
      </div>

      <aside className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-brand-dark">
            Pago y totales
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="min-w-0">
              <dt className="text-slate-500">Método de pago</dt>
              <dd className="mt-1 font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {paymentMethod?.label || order.paymentMethod}
              </dd>
            </div>
            {order.paidAt ? (
              <div className="min-w-0">
                <dt className="text-slate-500">Pago confirmado</dt>
                <dd className="mt-1 font-semibold text-brand-dark [overflow-wrap:anywhere]">
                  {formatDate(order.paidAt)}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-brand-dark/10 pt-3">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {formatCurrency(order.subtotal)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2">
              <dt className="text-slate-500">Entrega</dt>
              <dd className="font-semibold text-brand-dark [overflow-wrap:anywhere]">
                {order.deliveryFee === 0
                  ? "Gratis"
                  : formatCurrency(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-brand-dark/20 pt-4 text-base">
              <dt className="font-bold tabular-nums text-brand-dark [overflow-wrap:anywhere]">Total</dt>
              <dd className="font-bold tabular-nums text-brand-dark [overflow-wrap:anywhere]">
                {formatCurrency(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <CustomerOrderTimeline timeline={order.timeline} />
      </aside>
    </div>
  );
}
