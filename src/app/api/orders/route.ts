import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { paymentMethods } from "@/config/payment";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
};

type DeliveryZoneRow = {
  id: string;
  name: string;
  delivery_fee: number;
  is_active: boolean;
};

type OrderResponseRow = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  idempotency_payload_hash?: string | null;
};

const validPaymentMethods = new Set<string>(
  paymentMethods.map((method) => method.id),
);
const MAX_QUANTITY_PER_ITEM = 99;
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

function createPayloadHash(input: {
  name: string;
  phone: string;
  zoneName: string;
  address: string;
  references?: string;
  notes?: string;
  paymentMethod: string;
  items: ValidatedOrderItem[];
}) {
  const quantitiesByProductId = new Map<string, number>();

  for (const item of input.items) {
    quantitiesByProductId.set(
      item.productId,
      (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

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
    items: Array.from(quantitiesByProductId.entries())
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalizedPayload))
    .digest("hex");
}

function createOrderResponse(order: OrderResponseRow) {
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    status: order.status,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
  };
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

function createOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `AMI-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
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

  const idempotencyPayloadHash = createPayloadHash({
    name,
    phone,
    zoneName,
    address,
    references,
    notes,
    paymentMethod,
    items,
  });

  try {
    const { data: existingIdempotentOrder, error: existingOrderError } =
      await supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, status, subtotal, delivery_fee, total, idempotency_payload_hash",
        )
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "Failed to load idempotent order",
        existingOrderError,
      );
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    if (existingIdempotentOrder) {
      const existingOrder = existingIdempotentOrder as OrderResponseRow;

      if (existingOrder.idempotency_payload_hash !== idempotencyPayloadHash) {
        return jsonError(
          "La llave de idempotencia ya fue usada con otro pedido.",
          "IDEMPOTENCY_CONFLICT",
          409,
        );
      }

      return NextResponse.json(createOrderResponse(existingOrder));
    }

    const { data: deliveryZone, error: deliveryZoneError } =
      await supabaseAdmin
        .from("delivery_zones")
        .select("id, name, delivery_fee, is_active")
        .eq("name", zoneName)
        .eq("is_active", true)
        .maybeSingle();

    if (deliveryZoneError) {
      console.error("Failed to load delivery zone for order", deliveryZoneError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    if (!deliveryZone) {
      return jsonError(
        "Zona de entrega no encontrada.",
        "DELIVERY_ZONE_NOT_FOUND",
        404,
      );
    }

    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, is_active")
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      console.error("Failed to load products for order", productsError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    const productRows = (products ?? []) as ProductRow[];
    const productsById = new Map(
      productRows.map((product) => [product.id, product]),
    );

    if (productsById.size !== productIds.length) {
      return jsonError(
        "Uno o mas productos no fueron encontrados.",
        "PRODUCT_NOT_FOUND",
        404,
      );
    }

    const quantitiesByProductId = new Map<string, number>();

    for (const item of items) {
      const nextQuantity =
        (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity;

      if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
        return jsonError("Payload invalido.", "INVALID_PAYLOAD", 400);
      }

      quantitiesByProductId.set(
        item.productId,
        nextQuantity,
      );
    }

    for (const [productId, quantity] of quantitiesByProductId) {
      const product = productsById.get(productId);

      if (!product || product.stock < quantity) {
        return jsonError(
          "Stock insuficiente para uno o mas productos.",
          "INSUFFICIENT_STOCK",
          409,
        );
      }
    }

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new Error(`Missing product after validation: ${item.productId}`);
      }

      return {
        product,
        quantity: item.quantity,
        subtotal: product.price * item.quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (total, item) => total + item.subtotal,
      0,
    );
    const zone = deliveryZone as DeliveryZoneRow;
    const deliveryFee = zone.delivery_fee;
    const total = subtotal + deliveryFee;

    const { data: existingCustomer, error: existingCustomerError } =
      await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

    if (existingCustomerError) {
      console.error("Failed to load customer for order", existingCustomerError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    let customerId = existingCustomer?.id as string | undefined;

    if (!customerId) {
      const { data: newCustomer, error: createCustomerError } =
        await supabaseAdmin
          .from("customers")
          .insert({ name, phone })
          .select("id")
          .single();

      if (createCustomerError) {
        console.error("Failed to create customer for order", createCustomerError);
        return jsonError("Error interno.", "INTERNAL_ERROR", 500);
      }

      customerId = newCustomer.id as string;
    }

    const { data: newAddress, error: createAddressError } = await supabaseAdmin
      .from("addresses")
      .insert({
        customer_id: customerId,
        delivery_zone_id: zone.id,
        address,
        delivery_references: references ?? null,
      })
      .select("id")
      .single();

    if (createAddressError) {
      console.error("Failed to create address for order", createAddressError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    const orderNumber = createOrderNumber();
    const { data: newOrder, error: createOrderError } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        address_id: newAddress.id,
        status: "recibido",
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes ?? null,
        idempotency_key: idempotencyKey,
        idempotency_payload_hash: idempotencyPayloadHash,
      })
      .select(
        "id, order_number, status, subtotal, delivery_fee, total, idempotency_payload_hash",
      )
      .single();

    if (createOrderError) {
      if (createOrderError.code === "23505") {
        const { data: retryOrder, error: retryOrderError } =
          await supabaseAdmin
            .from("orders")
            .select(
              "id, order_number, status, subtotal, delivery_fee, total, idempotency_payload_hash",
            )
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (retryOrderError) {
          console.error("Failed to load order after idempotency conflict", {
            idempotencyKey,
            error: retryOrderError,
          });
          return jsonError("Error interno.", "INTERNAL_ERROR", 500);
        }

        if (retryOrder) {
          const existingOrder = retryOrder as OrderResponseRow;

          if (existingOrder.idempotency_payload_hash === idempotencyPayloadHash) {
            return NextResponse.json(createOrderResponse(existingOrder));
          }
        }

        return jsonError(
          "La llave de idempotencia ya fue usada con otro pedido.",
          "IDEMPOTENCY_CONFLICT",
          409,
        );
      }

      console.error("Failed to create order", createOrderError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    const { error: createItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(
        orderItems.map((item) => ({
          order_id: newOrder.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.subtotal,
        })),
      );

    if (createItemsError) {
      console.error("Failed to create order items", createItemsError);
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    const { error: createStatusHistoryError } = await supabaseAdmin
      .from("order_status_history")
      .insert({
        order_id: newOrder.id,
        previous_status: null,
        new_status: "recibido",
        changed_by: null,
        notes: "Pedido creado desde checkout.",
      });

    if (createStatusHistoryError) {
      console.error(
        "Failed to create order status history",
        createStatusHistoryError,
      );
      return jsonError("Error interno.", "INTERNAL_ERROR", 500);
    }

    return NextResponse.json(
      {
        ...createOrderResponse(newOrder as OrderResponseRow),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error creating order", error);
    return jsonError("Error interno.", "INTERNAL_ERROR", 500);
  }
}
