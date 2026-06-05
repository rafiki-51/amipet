import { NextResponse } from "next/server";
import { orderStatuses } from "@/config/orders";
import { getAdminApiUser } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/types/order";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StatusPayload = {
  status?: unknown;
};

const validStatuses = new Set<string>(orderStatuses);

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && validStatuses.has(value);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await getAdminApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { id } = await params;
  let payload: StatusPayload;

  try {
    payload = (await request.json()) as StatusPayload;
  } catch {
    return jsonError("Payload JSON invalido.", "INVALID_JSON", 400);
  }

  if (!isOrderStatus(payload.status)) {
    return jsonError("Status invalido.", "INVALID_STATUS", 400);
  }

  try {
    const { data: currentOrder, error: currentOrderError } =
      await supabaseAdmin
        .from("orders")
        .select("id, status, updated_at")
        .eq("id", id)
        .maybeSingle();

    if (currentOrderError) {
      console.error("Failed to load order before status update", {
        orderId: id,
        error: currentOrderError,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    if (!currentOrder) {
      return jsonError("Pedido no encontrado.", "ORDER_NOT_FOUND", 404);
    }

    const previousStatus = currentOrder.status as OrderStatus;
    const nextStatus = payload.status;

    if (previousStatus === nextStatus) {
      return NextResponse.json({
        orderId: currentOrder.id as string,
        status: previousStatus,
        previousStatus,
        updatedAt: currentOrder.updated_at as string | null,
      });
    }

    const { data: updatedOrder, error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id, status, updated_at")
      .single();

    if (updateOrderError) {
      console.error("Failed to update order status", {
        orderId: id,
        status: nextStatus,
        error: updateOrderError,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    const { error: statusHistoryError } = await supabaseAdmin
      .from("order_status_history")
      .insert({
        order_id: id,
        previous_status: previousStatus,
        new_status: nextStatus,
        changed_by: authResult.user.id,
        notes: "Estado actualizado desde admin MVP",
      });

    if (statusHistoryError) {
      console.error("Failed to insert order status history", {
        orderId: id,
        previousStatus,
        status: nextStatus,
        error: statusHistoryError,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    return NextResponse.json({
      orderId: updatedOrder.id as string,
      status: updatedOrder.status as OrderStatus,
      previousStatus,
      updatedAt: updatedOrder.updated_at as string | null,
    });
  } catch (error) {
    console.error("Unexpected error updating order status", {
      orderId: id,
      error,
    });

    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
