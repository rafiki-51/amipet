import { getCustomerOrderStatusLabel } from "@/components/account/orders/CustomerOrderStatusBadge";
import type { CustomerOrderTimelineEntry } from "@/types/customer-order";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CustomerOrderTimeline({
  timeline,
}: {
  timeline: CustomerOrderTimelineEntry[];
}) {
  const orderedTimeline = [...timeline].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <section className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold tracking-tight text-brand-dark">
        Seguimiento
      </h2>
      {orderedTimeline.length === 0 ? (
        <p className="mt-4 rounded-xl bg-brand-light p-4 text-sm leading-6 text-slate-600">
          Todavía no hay actualizaciones disponibles para este pedido.
        </p>
      ) : (
        <ol className="mt-6 space-y-6">
          {orderedTimeline.map((entry, index) => (
            <li
              key={`${entry.status}-${entry.createdAt}-${index}`}
              className="relative min-w-0 pl-7"
            >
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-brand-dark bg-brand-light" />
              {index < orderedTimeline.length - 1 ? (
                <span className="absolute left-[5px] top-5 h-[calc(100%+0.75rem)] w-px bg-brand-dark/20" />
              ) : null}
              <p className="font-semibold leading-6 text-brand-dark [overflow-wrap:anywhere]">
                {getCustomerOrderStatusLabel(entry.status)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">
                {formatDate(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
