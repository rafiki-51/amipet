import type { PaymentMethodId } from "@/config/payment";
import type { OrderItem, OrderStatus } from "@/types/order";

const ordersStorageKey = "amipet-orders";

export type LocalOrder = {
  id: string;
  customer: {
    name: string;
    phone: string;
    district: string;
    address: string;
    references?: string;
  };
  items: OrderItem[];
  paymentMethod: PaymentMethodId;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: 0;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

function isLocalOrder(value: unknown): value is LocalOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as Partial<LocalOrder>;

  return (
    typeof order.id === "string" &&
    Array.isArray(order.items) &&
    typeof order.paymentMethod === "string" &&
    typeof order.status === "string" &&
    typeof order.subtotal === "number" &&
    typeof order.deliveryFee === "number" &&
    typeof order.total === "number" &&
    typeof order.createdAt === "string" &&
    !!order.customer &&
    typeof order.customer === "object"
  );
}

export function getLocalOrders() {
  try {
    const storedOrders = window.localStorage.getItem(ordersStorageKey);

    if (!storedOrders) {
      return [];
    }

    const parsed = JSON.parse(storedOrders);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLocalOrder);
  } catch {
    return [];
  }
}

export function saveLocalOrders(orders: LocalOrder[]) {
  try {
    window.localStorage.setItem(ordersStorageKey, JSON.stringify(orders));
  } catch {
    // Keep checkout confirmation working if local storage is unavailable.
  }
}

export function addLocalOrder(order: LocalOrder) {
  const currentOrders = getLocalOrders();
  saveLocalOrders([order, ...currentOrders]);
}

export function updateLocalOrderStatus(orderId: string, status: OrderStatus) {
  const updatedOrders = getLocalOrders().map((order) =>
    order.id === orderId
      ? {
          ...order,
          status,
          updatedAt: new Date().toISOString(),
        }
      : order,
  );

  saveLocalOrders(updatedOrders);
  return updatedOrders;
}
