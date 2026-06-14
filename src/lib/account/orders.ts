import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PaymentMethodId } from "@/config/payment";
import type { PaymentStatus } from "@/config/payment-status";
import type {
  CustomerOrderDetail,
  CustomerOrderSummary,
} from "@/types/customer-order";
import type { OrderStatus } from "@/types/order";

const CUSTOMER_ORDER_LIST_LIMIT = 20;
const CUSTOMER_ORDER_PREVIEW_LIMIT = 3;

type OrderPreviewItemRow = {
  product_name: string;
  quantity: number;
};

type CustomerOrderSummaryRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  total: number;
  order_items: OrderPreviewItemRow[] | null;
};

type OrderItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type AddressRow = {
  address: string;
  delivery_references: string | null;
  delivery_zones:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type OrderTimelineRow = {
  id: string;
  new_status: OrderStatus;
  created_at: string;
};

type CustomerOrderDetailRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethodId;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  addresses: AddressRow | AddressRow[] | null;
  order_items: OrderItemRow[] | null;
  order_status_history: OrderTimelineRow[] | null;
};

export type CustomerOrdersQueryResult =
  | {
      orders: CustomerOrderSummary[];
      error: null;
    }
  | {
      orders: null;
      error: unknown;
    };

export type CustomerOrderDetailQueryResult =
  | {
      order: CustomerOrderDetail;
      error: null;
    }
  | {
      order: null;
      error: unknown;
    };

function firstOrNull<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapOrderSummary(row: CustomerOrderSummaryRow): CustomerOrderSummary {
  const items = row.order_items ?? [];

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    total: row.total,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    itemsPreview: items
      .slice(0, CUSTOMER_ORDER_PREVIEW_LIMIT)
      .map((item) => ({
        productName: item.product_name,
        quantity: item.quantity,
      })),
  };
}

function mapOrderDetail(row: CustomerOrderDetailRow): CustomerOrderDetail {
  const address = firstOrNull(row.addresses);
  const deliveryZone = firstOrNull(address?.delivery_zones);
  const timeline = [...(row.order_status_history ?? [])].sort((a, b) => {
    const dateDifference =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    return dateDifference || a.id.localeCompare(b.id);
  });

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    notes: row.notes,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
    delivery: {
      zoneName: deliveryZone?.name ?? "",
      address: address?.address ?? "",
      references: address?.delivery_references ?? null,
    },
    timeline: timeline.map((entry) => ({
      status: entry.new_status,
      createdAt: entry.created_at,
    })),
  };
}

export async function getCustomerOrders(
  userId: string,
): Promise<CustomerOrdersQueryResult> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        payment_status,
        created_at,
        total,
        order_items (
          product_name,
          quantity
        )
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CUSTOMER_ORDER_LIST_LIMIT);

  if (error) {
    return { orders: null, error };
  }

  const orders = ((data ?? []) as unknown as CustomerOrderSummaryRow[]).map(
    mapOrderSummary,
  );

  return { orders, error: null };
}

export async function getCustomerOrderById(
  userId: string,
  orderId: string,
): Promise<CustomerOrderDetailQueryResult> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        created_at,
        updated_at,
        paid_at,
        notes,
        subtotal,
        delivery_fee,
        total,
        addresses (
          address,
          delivery_references,
          delivery_zones (
            name
          )
        ),
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        ),
        order_status_history (
          id,
          new_status,
          created_at
        )
      `,
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { order: null, error };
  }

  if (!data) {
    return { order: null, error: null };
  }

  return {
    order: mapOrderDetail(data as unknown as CustomerOrderDetailRow),
    error: null,
  };
}
