import { orderStatuses } from "@/config/orders";

export type OrderStatus = (typeof orderStatuses)[number];

export type CustomerInfo = {
  name: string;
  phone: string;
  district: string;
  address: string;
  references?: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Order = {
  id: string;
  customer: CustomerInfo;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string;
  createdAt: string;
};