export const paymentMethods = [
  {
    id: "sinpe-movil",
    label: "SINPE móvil",
    description: "Coordinamos el número y comprobante por WhatsApp.",
  },
  {
    id: "efectivo-contra-entrega",
    label: "Efectivo contra entrega",
    description: "Pagás al recibir el pedido.",
  },
  {
    id: "coordinar-whatsapp",
    label: "Coordinar por WhatsApp",
    description: "Definimos el pago al confirmar disponibilidad.",
  },
] as const;

export type PaymentMethodId = (typeof paymentMethods)[number]["id"];
