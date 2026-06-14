import { NextResponse } from "next/server";
import { getCustomerApiUser } from "@/lib/account/auth";
import { getCustomerOrders } from "@/lib/account/orders";

export async function GET() {
  const authResult = await getCustomerApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    const result = await getCustomerOrders(authResult.user.id);

    if (result.error) {
      console.error("Failed to load customer orders", result.error);

      return NextResponse.json(
        { error: "No se pudieron cargar los pedidos." },
        { status: 500 },
      );
    }

    return NextResponse.json({ orders: result.orders });
  } catch (error) {
    console.error("Unexpected error loading customer orders", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos." },
      { status: 500 },
    );
  }
}
