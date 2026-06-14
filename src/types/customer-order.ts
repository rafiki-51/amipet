import type { PaymentMethodId } from "@/config/payment";
import type { PaymentStatus } from "@/config/payment-status";
import type { OrderStatus } from "@/types/order";

export type CustomerOrderPreviewItem = {
  productName: string;
  quantity: number;
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  total: number;
  itemCount: number;
  itemsPreview: CustomerOrderPreviewItem[];
};

export type CustomerOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type CustomerOrderTimelineEntry = {
  status: OrderStatus;
  createdAt: string;
};

export type CustomerOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodId;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: CustomerOrderItem[];
  delivery: {
    zoneName: string;
    address: string;
    references: string | null;
  };
  timeline: CustomerOrderTimelineEntry[];
};
