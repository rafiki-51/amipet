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
  cancellationReason?: unknown;
};

const validStatuses = new Set<string>(orderStatuses);
const rpcErrorCodes = [
  "INVALID_PAYLOAD",
  "ORDER_NOT_FOUND",
  "INVALID_ORDER_TRANSITION",
  "CANCELLATION_REASON_REQUIRED",
  "PAID_ORDER_CANNOT_BE_CANCELED",
  "ORDER_ITEMS_NOT_RESTORABLE",
  "STOCK_RESTORE_FAILED",
] as const;

type RpcErrorCode = (typeof rpcErrorCodes)[number] | "INTERNAL_ERROR";

type TransitionOrderStatusRow = {
  order_id: string;
  previous_status: OrderStatus;
  status: OrderStatus;
  payment_status: "pending" | "paid" | "canceled";
  updated_at: string;
  canceled_at: string | null;
  stock_restored_at: string | null;
};

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && validStatuses.has(value);
}

function getRpcErrorCode(message?: string): RpcErrorCode {
  if (!message) {
    return "INTERNAL_ERROR";
  }

  return (
    rpcErrorCodes.find((code) => message.includes(code)) ?? "INTERNAL_ERROR"
  );
}

function createRpcErrorResponse(code: RpcErrorCode) {
  switch (code) {
    case "INVALID_PAYLOAD":
      return jsonError("Payload invalido.", code, 400);
    case "ORDER_NOT_FOUND":
      return jsonError("Pedido no encontrado.", code, 404);
    case "INVALID_ORDER_TRANSITION":
      return jsonError("Transicion de estado no permitida.", code, 409);
    case "CANCELLATION_REASON_REQUIRED":
      return jsonError("El motivo de cancelacion es obligatorio.", code, 400);
    case "PAID_ORDER_CANNOT_BE_CANCELED":
      return jsonError("Un pedido pagado no puede cancelarse.", code, 409);
    case "ORDER_ITEMS_NOT_RESTORABLE":
      return jsonError(
        "No se puede restaurar el inventario de este pedido.",
        code,
        409,
      );
    case "STOCK_RESTORE_FAILED":
      return jsonError("No se pudo restaurar el inventario.", code, 500);
    default:
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
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

  const cancellationReason =
    typeof payload.cancellationReason === "string"
      ? payload.cancellationReason.trim()
      : "";

  if (payload.status === "cancelado" && !cancellationReason) {
    return jsonError(
      "El motivo de cancelacion es obligatorio.",
      "CANCELLATION_REASON_REQUIRED",
      400,
    );
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("transition_order_status", {
      p_order_id: id,
      p_next_status: payload.status,
      p_changed_by: authResult.user.id,
      p_cancellation_reason:
        payload.status === "cancelado" ? cancellationReason : null,
    });

    if (error) {
      const code = getRpcErrorCode(error.message);

      if (code === "INTERNAL_ERROR" || code === "STOCK_RESTORE_FAILED") {
        console.error("Failed to transition order status through RPC", {
          orderId: id,
          status: payload.status,
          error,
        });
      }

      return createRpcErrorResponse(code);
    }

    const transition = (
      Array.isArray(data) ? data[0] : data
    ) as TransitionOrderStatusRow | null;

    if (!transition) {
      console.error("Order status transition RPC returned no data", {
        orderId: id,
        status: payload.status,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    return NextResponse.json({
      orderId: transition.order_id,
      previousStatus: transition.previous_status,
      status: transition.status,
      paymentStatus: transition.payment_status,
      updatedAt: transition.updated_at,
      canceledAt: transition.canceled_at,
      stockRestoredAt: transition.stock_restored_at,
    });
  } catch (error) {
    console.error("Unexpected error updating order status", {
      orderId: id,
      error,
    });

    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
