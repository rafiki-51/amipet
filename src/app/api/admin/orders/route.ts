import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdminOrder } from "@/types/admin-order";
import type { PaymentMethodId } from "@/config/payment";
import type { PaymentStatus } from "@/config/payment-status";
import type { OrderStatus } from "@/types/order";

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethodId;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
  customers:
    | {
        name: string;
        phone: string;
      }
    | {
        name: string;
        phone: string;
      }[]
    | null;
  addresses:
    | {
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
      }
    | {
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
      }[]
    | null;
  order_items: OrderItemRow[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapOrderRowToAdminOrder(row: OrderRow): AdminOrder {
  const customer = firstOrNull(row.customers);
  const address = firstOrNull(row.addresses);
  const deliveryZone = firstOrNull(address?.delivery_zones);

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    total: row.total,
    notes: row.notes ?? undefined,
    adminNotes: row.admin_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    customer: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
    },
    delivery: {
      zoneName: deliveryZone?.name ?? "",
      address: address?.address ?? "",
      references: address?.delivery_references ?? undefined,
    },
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
    })),
  };
}

export async function GET() {
  const authResponse = await requireAdminApiSession();

  if (authResponse) {
    return authResponse;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          payment_method,
          payment_status,
          subtotal,
          delivery_fee,
          total,
          notes,
          admin_notes,
          created_at,
          updated_at,
          customers (
            name,
            phone
          ),
          addresses (
            address,
            delivery_references,
            delivery_zones (
              name
            )
          ),
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal
          )
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load admin orders", error);

      return NextResponse.json(
        { error: "No se pudieron cargar los pedidos." },
        { status: 500 },
      );
    }

    const orders = ((data ?? []) as unknown as OrderRow[]).map(
      mapOrderRowToAdminOrder,
    );

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Unexpected error loading admin orders", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos." },
      { status: 500 },
    );
  }
}
