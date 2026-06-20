import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AdminOrder } from "@/types/admin-order";
import { paymentMethods, type PaymentMethodId } from "@/config/payment";
import {
  paymentStatuses,
  type PaymentStatus,
} from "@/config/payment-status";
import { orderStatuses } from "@/config/orders";
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
  paid_at: string | null;
  payment_confirmed_by: string | null;
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

type AdminOrdersPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type DeliveryZoneRow = {
  name: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const validOrderStatuses = new Set<string>(orderStatuses);
const validPaymentStatuses = new Set<string>(paymentStatuses);
const validPaymentMethods = new Set<string>(
  paymentMethods.map((method) => method.id),
);

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
    paidAt: row.paid_at ?? undefined,
    paymentConfirmedBy: row.payment_confirmed_by ?? undefined,
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

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function createPagination(
  page: number,
  limit: number,
  total: number,
): AdminOrdersPagination {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export async function GET(request: Request) {
  const authResponse = await requireAdminApiSession();

  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const parsedPage = parsePositiveInteger(
    searchParams.get("page"),
    DEFAULT_PAGE,
  );
  const parsedLimit = parsePositiveInteger(
    searchParams.get("limit"),
    DEFAULT_LIMIT,
  );

  if (parsedPage === null || parsedLimit === null) {
    return NextResponse.json(
      { error: "Parametros de paginacion invalidos." },
      { status: 400 },
    );
  }

  const page = parsedPage;
  const limit = Math.min(parsedLimit, MAX_LIMIT);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const paymentMethod = searchParams.get("paymentMethod");
  const zone = searchParams.get("zone");

  if (status && !validOrderStatuses.has(status)) {
    return NextResponse.json(
      { error: "Filtro de estado invalido." },
      { status: 400 },
    );
  }

  if (paymentStatus && !validPaymentStatuses.has(paymentStatus)) {
    return NextResponse.json(
      { error: "Filtro de pago invalido." },
      { status: 400 },
    );
  }

  if (paymentMethod && !validPaymentMethods.has(paymentMethod)) {
    return NextResponse.json(
      { error: "Filtro de metodo de pago invalido." },
      { status: 400 },
    );
  }

  try {
    let query = supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          payment_method,
          payment_status,
          paid_at,
          payment_confirmed_by,
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
          addresses!inner (
            address,
            delivery_references,
            delivery_zones!inner (
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
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (paymentStatus) {
      query = query.eq("payment_status", paymentStatus);
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }

    if (zone) {
      query = query.eq("addresses.delivery_zones.name", zone);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

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
    const pagination = createPagination(page, limit, count ?? 0);
    const { data: zoneRows, error: zonesError } = await supabaseAdmin
      .from("delivery_zones")
      .select("name")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (zonesError) {
      console.error("Failed to load admin order zone filters", zonesError);
    }

    const zones = ((zoneRows ?? []) as DeliveryZoneRow[])
      .map((deliveryZone) => deliveryZone.name)
      .filter(Boolean);

    return NextResponse.json({
      orders,
      pagination,
      filterOptions: {
        zones,
      },
    });
  } catch (error) {
    console.error("Unexpected error loading admin orders", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos." },
      { status: 500 },
    );
  }
}
