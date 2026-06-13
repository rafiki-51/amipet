export const paymentStatuses = ["pending", "paid", "canceled"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  canceled: "Cancelado",
};
