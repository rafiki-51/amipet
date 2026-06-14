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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">
                Pedido
              </p>
              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {order.orderNumber}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <CustomerOrderStatusBadge status={order.status} />
              <CustomerPaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Productos
          </h2>
          <div className="mt-5 divide-y divide-slate-100">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="font-bold text-slate-950">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Entrega
          </h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Zona</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {order.delivery.zoneName || "Sin zona registrada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Direccion</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-slate-950">
                {order.delivery.address || "Sin direccion registrada"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Referencias</dt>
              <dd className="mt-1 whitespace-pre-wrap font-semibold text-slate-950">
                {order.delivery.references || "Sin referencias"}
              </dd>
            </div>
          </dl>
        </section>

        {order.notes ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">
              Notas del pedido
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {order.notes}
            </p>
          </section>
        ) : null}
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            Pago y totales
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Metodo de pago</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {paymentMethod?.label || order.paymentMethod}
              </dd>
            </div>
            {order.paidAt ? (
              <div>
                <dt className="text-slate-500">Pago confirmado</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {formatDate(order.paidAt)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold text-slate-950">
                {formatCurrency(order.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Delivery</dt>
              <dd className="font-semibold text-slate-950">
                {order.deliveryFee === 0
                  ? "Gratis"
                  : formatCurrency(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-4 text-base">
              <dt className="font-bold text-slate-950">Total</dt>
              <dd className="font-bold text-slate-950">
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
