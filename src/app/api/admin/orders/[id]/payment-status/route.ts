import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/config/payment-status";
import type { OrderStatus } from "@/types/order";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const rpcErrorCodes = [
  "INVALID_PAYLOAD",
  "ORDER_NOT_FOUND",
  "INVALID_PAYMENT_TRANSITION",
  "ORDER_CANCELED",
] as const;

type RpcErrorCode = (typeof rpcErrorCodes)[number] | "INTERNAL_ERROR";

type TransitionOrderPaymentStatusRow = {
  order_id: string;
  status: OrderStatus;
  previous_payment_status: PaymentStatus;
  payment_status: PaymentStatus;
  paid_at: string | null;
  payment_confirmed_by: string | null;
  updated_at: string;
};

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function isPaidPaymentStatusPayload(
  value: unknown,
): value is { paymentStatus: "paid" } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    "paymentStatus" in value &&
    value.paymentStatus === "paid"
  );
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
    case "INVALID_PAYMENT_TRANSITION":
      return jsonError("Transicion de pago no permitida.", code, 409);
    case "ORDER_CANCELED":
      return jsonError(
        "No se puede confirmar el pago de un pedido cancelado.",
        code,
        409,
      );
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Payload JSON invalido.", "INVALID_JSON", 400);
  }

  if (!isPaidPaymentStatusPayload(payload)) {
    return jsonError("Estado de pago invalido.", "INVALID_PAYMENT_STATUS", 400);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "transition_order_payment_status",
      {
        p_order_id: id,
        p_next_payment_status: "paid",
        p_changed_by: authResult.user.id,
      },
    );

    if (error) {
      const code = getRpcErrorCode(error.message);

      if (code === "INTERNAL_ERROR") {
        console.error("Failed to transition order payment status through RPC", {
          orderId: id,
          error,
        });
      }

      return createRpcErrorResponse(code);
    }

    const transition = (
      Array.isArray(data) ? data[0] : data
    ) as TransitionOrderPaymentStatusRow | null;

    if (!transition) {
      console.error("Order payment status transition RPC returned no data", {
        orderId: id,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    return NextResponse.json({
      orderId: transition.order_id,
      status: transition.status,
      previousPaymentStatus: transition.previous_payment_status,
      paymentStatus: transition.payment_status,
      paidAt: transition.paid_at,
      paymentConfirmedBy: transition.payment_confirmed_by,
      updatedAt: transition.updated_at,
    });
  } catch (error) {
    console.error("Unexpected error updating order payment status", {
      orderId: id,
      error,
    });

    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
