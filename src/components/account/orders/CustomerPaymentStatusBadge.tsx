import type { PaymentStatus } from "@/config/payment-status";

const statusLabels: Record<PaymentStatus, string> = {
  pending: "Pago pendiente",
  paid: "Pagado",
  canceled: "Pago cancelado",
};

const statusStyles: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  canceled: "bg-slate-200 text-slate-700",
};

export function CustomerPaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full border border-current/15 px-3 py-1.5 text-center text-xs font-semibold leading-5 [overflow-wrap:anywhere] ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
