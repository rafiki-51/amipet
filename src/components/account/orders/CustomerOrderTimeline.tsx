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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-950">
        Seguimiento
      </h2>
      {orderedTimeline.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Todavia no hay actualizaciones disponibles para este pedido.
        </p>
      ) : (
        <ol className="mt-6 space-y-5">
          {orderedTimeline.map((entry, index) => (
            <li
              key={`${entry.status}-${entry.createdAt}-${index}`}
              className="relative pl-7"
            >
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-emerald-500" />
              {index < orderedTimeline.length - 1 ? (
                <span className="absolute left-[5px] top-5 h-[calc(100%+0.5rem)] w-px bg-emerald-200" />
              ) : null}
              <p className="font-semibold text-slate-950">
                {getCustomerOrderStatusLabel(entry.status)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
