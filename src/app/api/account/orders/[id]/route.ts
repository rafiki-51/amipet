import { NextResponse } from "next/server";
import { getCustomerApiUser } from "@/lib/account/auth";
import { getCustomerOrderById } from "@/lib/account/orders";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authResult = await getCustomerApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  const { id } = await params;

  if (!uuidPattern.test(id)) {
    return jsonError("ID de pedido invalido.", "INVALID_ORDER_ID", 400);
  }

  try {
    const result = await getCustomerOrderById(authResult.user.id, id);

    if (result.error) {
      console.error("Failed to load customer order", {
        orderId: id,
        error: result.error,
      });

      return jsonError(
        "No se pudo cargar el pedido.",
        "INTERNAL_ERROR",
        500,
      );
    }

    if (!result.order) {
      return jsonError("Pedido no encontrado.", "ORDER_NOT_FOUND", 404);
    }

    return NextResponse.json({ order: result.order });
  } catch (error) {
    console.error("Unexpected error loading customer order", {
      orderId: id,
      error,
    });

    return jsonError("No se pudo cargar el pedido.", "INTERNAL_ERROR", 500);
  }
}
