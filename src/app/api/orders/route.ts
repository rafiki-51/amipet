import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { paymentMethods } from "@/config/payment";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isCustomerRole } from "@/lib/auth/roles";
import {
  createRateLimitHeaders,
  rateLimitByIp,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type CreateOrderPayload = {
  customer?: {
    name?: unknown;
    phone?: unknown;
  };
  delivery?: {
    zoneName?: unknown;
    address?: unknown;
    references?: unknown;
  };
  paymentMethod?: unknown;
  notes?: unknown;
  items?: unknown;
  honeypot?: unknown;
  idempotencyKey?: unknown;
};

type ValidatedOrderItem = {
  productId: string;
  quantity: number;
};

type NormalizedOrderItem = {
  product_id: string;
  quantity: number;
};

type CheckoutOrderRpcRow = {
  order_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
};

const validPaymentMethods = new Set<string>(
  paymentMethods.map((method) => method.id),
);
const MAX_QUANTITY_PER_ITEM = 99;
const CHECKOUT_RATE_LIMIT = {
  endpoint: "/api/orders",
  limit: 10,
  windowSeconds: 10 * 60,
};
const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalTrimmedString(value: unknown) {
  const trimmed = getTrimmedString(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

function countPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "").length;
}

function isValidIdempotencyKey(value: string) {
  return idempotencyKeyPattern.test(value);
}

function normalizeItems(items: ValidatedOrderItem[]) {
  const quantitiesByProductId = new Map<string, number>();

  for (const item of items) {
    const nextQuantity =
      (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity;

    if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
      return null;
    }

    quantitiesByProductId.set(item.productId, nextQuantity);
  }

  return Array.from(quantitiesByProductId.entries())
    .map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
    }))
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
}

function createPayloadHash(input: {
  name: string;
  phone: string;
  zoneName: string;
  address: string;
  references?: string;
  notes?: string;
  paymentMethod: string;
  items: NormalizedOrderItem[];
}) {
  const normalizedPayload = {
    name: input.name,
    phone: input.phone,
    delivery: {
      zoneName: input.zoneName,
      address: input.address,
      references: input.references ?? null,
    },
    paymentMethod: input.paymentMethod,
    notes: input.notes ?? null,
    items: input.items,
  };

  return createHash("sha256")
    .update(JSON.stringify(normalizedPayload))
    .digest("hex");
}

function createOrderResponse(order: CheckoutOrderRpcRow) {
  return {
    orderId: order.order_id,
    orderNumber: order.order_number,
    status: order.status,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
  };
}

function getRpcErrorCode(message?: string) {
  if (!message) {
    return "INTERNAL_ERROR";
  }

  if (message.includes("INVALID_PAYLOAD")) {
    return "INVALID_PAYLOAD";
  }

  if (message.includes("IDEMPOTENCY_CONFLICT")) {
    return "IDEMPOTENCY_CONFLICT";
  }

  if (message.includes("PRODUCT_NOT_FOUND")) {
    return "PRODUCT_NOT_FOUND";
  }

  if (message.includes("DELIVERY_ZONE_NOT_FOUND")) {
    return "DELIVERY_ZONE_NOT_FOUND";
  }

  if (message.includes("INSUFFICIENT_STOCK")) {
    return "INSUFFICIENT_STOCK";
  }

  return "INTERNAL_ERROR";
}

function createRpcErrorResponse(code: string) {
  switch (code) {
    case "INVALID_PAYLOAD":
      return jsonError("Payload invalido.", code, 400);
    case "IDEMPOTENCY_CONFLICT":
      return jsonError(
        "La llave de idempotencia ya fue usada con otro pedido.",
        code,
        409,
      );
    case "PRODUCT_NOT_FOUND":
      return jsonError(
        "Uno o mas productos no fueron encontrados.",
        code,
        404,
      );
    case "DELIVERY_ZONE_NOT_FOUND":
      return jsonError(
        "Zona de entrega no encontrada.",
        code,
        404,
      );
    case "INSUFFICIENT_STOCK":
      return jsonError(
        "Stock insuficiente para uno o mas productos.",
        code,
        409,
      );
    default:
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}

function validateItems(items: unknown): ValidatedOrderItem[] | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const validatedItems: ValidatedOrderItem[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      return null;
    }

    const productId = getTrimmedString(item.productId);
    const quantity = item.quantity;

    if (
      !productId ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return null;
    }

    validatedItems.push({ productId, quantity });
  }

  return validatedItems;
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimitByIp(
    request.headers,
    CHECKOUT_RATE_LIMIT,
  );

  if ("error" in rateLimitResult && rateLimitResult.error) {
    console.error("Checkout rate limiter failed open", {
      endpoint: CHECKOUT_RATE_LIMIT.endpoint,
      ipHash: rateLimitResult.ipHash,
      error: rateLimitResult.error,
    });
  }

  if (!rateLimitResult.allowed) {
    console.warn("Checkout rate limit exceeded", {
      endpoint: CHECKOUT_RATE_LIMIT.endpoint,
      ipHash: rateLimitResult.ipHash,
      limit: rateLimitResult.limit,
      windowSeconds: CHECKOUT_RATE_LIMIT.windowSeconds,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Demasiados intentos. Intentá nuevamente en unos minutos.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      },
    );
  }

  let payload: CreateOrderPayload;

  try {
    payload = (await request.json()) as CreateOrderPayload;
  } catch {
    return jsonError("Payload JSON invalido.", "INVALID_JSON", 400);
  }

  const customer = isRecord(payload.customer) ? payload.customer : null;
  const delivery = isRecord(payload.delivery) ? payload.delivery : null;
  const name = getTrimmedString(customer?.name);
  const phone = getTrimmedString(customer?.phone);
  const zoneName = getTrimmedString(delivery?.zoneName);
  const address = getTrimmedString(delivery?.address);
  const references = getOptionalTrimmedString(delivery?.references);
  const notes = getOptionalTrimmedString(payload.notes);
  const paymentMethod = getTrimmedString(payload.paymentMethod);
  const honeypot = getTrimmedString(payload.honeypot);
  const idempotencyKey = getTrimmedString(payload.idempotencyKey);
  const items = validateItems(payload.items);

  if (
    honeypot ||
    !isValidIdempotencyKey(idempotencyKey) ||
    name.length < 3 ||
    countPhoneDigits(phone) < 8 ||
    !zoneName ||
    address.length < 10 ||
    !validPaymentMethods.has(paymentMethod) ||
    !items
  ) {
    return jsonError("Payload invalido.", "INVALID_PAYLOAD", 400);
  }

  const normalizedItems = normalizeItems(items);

  if (!normalizedItems) {
    return jsonError("Payload invalido.", "INVALID_PAYLOAD", 400);
  }

  const idempotencyPayloadHash = createPayloadHash({
    name,
    phone,
    zoneName,
    address,
    references,
    notes,
    paymentMethod,
    items: normalizedItems,
  });

  let checkoutUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Failed to resolve checkout authentication", authError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to validate checkout customer profile", profileError);
        return jsonError("Error interno.", "INTERNAL_ERROR", 500);
      }

      if (!profile || !isCustomerRole(profile.role)) {
        return jsonError(
          "Esta cuenta no puede realizar pedidos como cliente.",
          "FORBIDDEN",
          403,
        );
      }

      checkoutUserId = user.id;
    }
  } catch (error) {
    console.error("Unexpected error resolving checkout authentication", error);
    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("create_checkout_order", {
      p_customer_name: name,
      p_customer_phone: phone,
      p_zone_name: zoneName,
      p_address: address,
      p_references: references ?? null,
      p_payment_method: paymentMethod,
      p_notes: notes ?? null,
      p_idempotency_key: idempotencyKey,
      p_idempotency_payload_hash: idempotencyPayloadHash,
      p_items: normalizedItems,
      p_user_id: checkoutUserId,
    });

    if (error) {
      const code = getRpcErrorCode(error.message);

      if (code === "INTERNAL_ERROR") {
        console.error("Failed to create checkout order through RPC", error);
      }

      return createRpcErrorResponse(code);
    }

    const order = Array.isArray(data) ? data[0] : data;

    if (!order) {
      console.error("Checkout order RPC returned no data");
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    return NextResponse.json(
      createOrderResponse(order as CheckoutOrderRpcRow),
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error creating order", error);
    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
