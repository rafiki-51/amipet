import type { PaymentMethodId } from "@/config/payment";
import type { PaymentStatus } from "@/config/payment-status";
import type { OrderStatus } from "@/types/order";

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethodId;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    zoneName: string;
    address: string;
    references?: string;
  };
  items: AdminOrderItem[];
};
