import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LinkCustomerPayload = {
  userId?: unknown;
};

type LinkedOrderRow = {
  order_id: string;
  order_number: string;
  user_id: string;
  user_linked_at: string;
  user_link_source: "manual-support";
};

const rpcErrorCodes = [
  "INVALID_PAYLOAD",
  "ORDER_NOT_FOUND",
  "ORDER_ALREADY_LINKED",
  "INVALID_TARGET_USER",
] as const;

type RpcErrorCode = (typeof rpcErrorCodes)[number] | "INTERNAL_ERROR";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function getStrictPayloadUserId(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const keys = Object.keys(payload);

  if (keys.length !== 1 || keys[0] !== "userId") {
    return null;
  }

  const userId = (payload as LinkCustomerPayload).userId;

  return typeof userId === "string" ? userId.trim() : null;
}

function createLinkedOrderResponse(order: LinkedOrderRow) {
  return {
    order: {
      id: order.order_id,
      orderNumber: order.order_number,
      userId: order.user_id,
      userLinkedAt: order.user_linked_at,
      userLinkSource: order.user_link_source,
    },
  };
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
    case "ORDER_ALREADY_LINKED":
      return jsonError("El pedido ya esta vinculado.", code, 409);
    case "INVALID_TARGET_USER":
      return jsonError("Usuario destino invalido.", code, 400);
    default:
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await getAdminApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { id: orderId } = await params;

  if (!isUuid(orderId)) {
    return jsonError("Order id invalido.", "INVALID_ORDER_ID", 400);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError("Payload JSON invalido.", "INVALID_JSON", 400);
  }

  const targetUserId = getStrictPayloadUserId(payload);

  if (!targetUserId || !isUuid(targetUserId)) {
    return jsonError("User id invalido.", "INVALID_USER_ID", 400);
  }

  try {
    const { data: linkedOrder, error: linkError } = await supabaseAdmin
      .rpc("link_order_to_customer_manual", {
        p_order_id: orderId,
        p_target_user_id: targetUserId,
        p_changed_by: authResult.user.id,
      });

    if (linkError) {
      const code = getRpcErrorCode(linkError.message);

      if (code === "INTERNAL_ERROR") {
        console.error("Failed to link order to customer manually", {
          orderId,
          targetUserId,
          error: linkError,
        });
      }

      return createRpcErrorResponse(code);
    }

    const order = Array.isArray(linkedOrder) ? linkedOrder[0] : linkedOrder;

    if (!order) {
      console.error("Manual order customer link RPC returned no data", {
        orderId,
        targetUserId,
      });

      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    console.info("Admin linked guest order to customer", {
      actorUserId: authResult.user.id,
      orderId,
      targetUserId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      createLinkedOrderResponse(order as LinkedOrderRow),
    );
  } catch (error) {
    console.error("Unexpected error linking order to customer manually", {
      orderId,
      targetUserId,
      error,
    });

    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
