"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { paymentMethods, type PaymentMethodId } from "@/config/payment";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";

type CheckoutForm = {
  name: string;
  phone: string;
  district: string;
  address: string;
  references: string;
  notes: string;
  paymentMethod: PaymentMethodId | "";
  website: string;
};

type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;
type CheckoutTouched = Partial<Record<keyof CheckoutForm, boolean>>;

type CheckoutClientProps = {
  coverageZones: string[];
};

type CreateOrderPayload = {
  customer: {
    name: string;
    phone: string;
  };
  delivery: {
    zoneName: string;
    address: string;
    references?: string;
  };
  paymentMethod: PaymentMethodId;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  honeypot: string;
  idempotencyKey: string;
};

type CreateOrderResponse = {
  orderId: string;
  orderNumber: string;
  status: "recibido";
  subtotal: number;
  deliveryFee: number;
  total: number;
};

type ApiErrorResponse = {
  error: string;
  code: string;
};

type ConfirmedOrder = CreateOrderResponse & {
  customerName: string;
  paymentMethod: PaymentMethodId;
  totalItems: number;
};

const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  district: "",
  address: "",
  references: "",
  notes: "",
  paymentMethod: "",
  website: "",
};

function countPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "").length;
}

function validateForm(
  form: CheckoutForm,
  coverageZones: string[],
): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (form.name.trim().length < 3) {
    errors.name = "Ingresá tu nombre completo.";
  }

  if (countPhoneDigits(form.phone) < 8) {
    errors.phone = "Ingresá un teléfono o WhatsApp válido.";
  }

  if (!coverageZones.includes(form.district)) {
    errors.district = "Seleccioná una zona de entrega.";
  }

  if (form.address.trim().length < 10) {
    errors.address = "Ingresá una dirección exacta.";
  }

  if (!paymentMethods.some((method) => method.id === form.paymentMethod)) {
    errors.paymentMethod = "Seleccioná un método de pago.";
  }

  return errors;
}

function getSubmitErrorMessage(errorResponse: ApiErrorResponse | null) {
  switch (errorResponse?.code) {
    case "INVALID_JSON":
    case "INVALID_PAYLOAD":
      return "Revisá los datos del pedido e intentá nuevamente.";
    case "DELIVERY_ZONE_NOT_FOUND":
      return "La zona seleccionada ya no está disponible.";
    case "PRODUCT_NOT_FOUND":
      return "Uno o más productos ya no están disponibles.";
    case "INSUFFICIENT_STOCK":
      return "No hay stock suficiente para uno o más productos.";
    case "IDEMPOTENCY_CONFLICT":
      return "Detectamos un intento duplicado con datos distintos. Actualizá la página e intentá de nuevo.";
    default:
      return "No pudimos confirmar el pedido. Intentá nuevamente en unos minutos.";
  }
}

export function CheckoutClient({ coverageZones }: CheckoutClientProps) {
  const { items, totalItems, subtotal, isHydrated, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [touched, setTouched] = useState<CheckoutTouched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const idempotencyCartSignatureRef = useRef<string | null>(null);

  const errors = useMemo(
    () => validateForm(form, coverageZones),
    [coverageZones, form],
  );
  const isFormValid = Object.keys(errors).length === 0;
  const canConfirm =
    isHydrated && items.length > 0 && isFormValid && !isSubmitting;
  const cartSignature = useMemo(
    () =>
      items
        .map((item) => `${item.product.id}:${item.quantity}`)
        .sort()
        .join("|"),
    [items],
  );

  function updateField<Field extends keyof CheckoutForm>(
    field: Field,
    value: CheckoutForm[Field],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function touchField(field: keyof CheckoutForm) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function getFieldError(field: keyof CheckoutForm) {
    return submitted || touched[field] ? errors[field] : undefined;
  }

  function getIdempotencyKey() {
    if (
      !idempotencyKeyRef.current ||
      idempotencyCartSignatureRef.current !== cartSignature
    ) {
      idempotencyKeyRef.current = crypto.randomUUID();
      idempotencyCartSignatureRef.current = cartSignature;
    }

    return idempotencyKeyRef.current;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError(null);

    if (isSubmitting || !canConfirm || form.paymentMethod === "") {
      return;
    }

    const idempotencyKey = getIdempotencyKey();
    const payload: CreateOrderPayload = {
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
      },
      delivery: {
        zoneName: form.district,
        address: form.address.trim(),
        references: form.references.trim() || undefined,
      },
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      honeypot: form.website.trim(),
      idempotencyKey,
    };

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as
        | CreateOrderResponse
        | ApiErrorResponse;

      if (!response.ok) {
        setSubmitError(
          getSubmitErrorMessage(responseBody as ApiErrorResponse | null),
        );
        return;
      }

      const createdOrder = responseBody as CreateOrderResponse;

      setConfirmedOrder({
        ...createdOrder,
        customerName: form.name.trim(),
        paymentMethod: form.paymentMethod,
        totalItems,
      });
      idempotencyKeyRef.current = null;
      idempotencyCartSignatureRef.current = null;
      clearCart();
    } catch {
      setSubmitError(
        "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (confirmedOrder) {
    const selectedPayment = paymentMethods.find(
      (method) => method.id === confirmedOrder.paymentMethod,
    );

    return (
      <main className="min-h-screen bg-white px-4 py-10 text-slate-900 sm:px-6 sm:py-12 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-brand-purple">
        <section className="mx-auto max-w-3xl rounded-2xl border border-brand-dark/10 bg-brand-light p-6 text-center sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
            Pedido recibido
          </p>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Gracias, {confirmedOrder.customerName}
          </h1>
          <p className="mt-4 break-words leading-7 text-slate-700">
            Tu número de pedido es{" "}
            <span className="break-words font-bold text-brand-dark">
              {confirmedOrder.orderNumber}
            </span>
            .
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ¡Tu pedido quedó registrado! Te contactaremos por WhatsApp para
            coordinar la entrega y el pago, según el método elegido. Recordá que
            registrar el pedido no significa que el pago se haya realizado.
          </p>

          <div className="mt-8 rounded-xl border border-brand-dark/10 bg-white p-4 text-left shadow-sm sm:p-6">
            <h2 className="font-semibold text-brand-dark">Resumen del pedido</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex flex-wrap justify-between gap-3">
                <span>Productos</span>
                <span className="break-words font-medium text-brand-dark">
                  {confirmedOrder.totalItems}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <span>Método de pago elegido</span>
                <span className="text-right break-words font-medium text-brand-dark">
                  {selectedPayment?.label}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <span>Subtotal</span>
                <span className="break-words font-medium text-brand-dark">
                  {formatCurrency(confirmedOrder.subtotal)}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <span>Entrega</span>
                <span className="break-words font-medium text-brand-dark">
                  {confirmedOrder.deliveryFee === 0
                    ? "Gratis"
                    : formatCurrency(confirmedOrder.deliveryFee)}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-3 border-t border-brand-dark/15 pt-3 text-base">
                <span className="font-semibold text-brand-dark">Total</span>
                <span className="break-words font-bold tabular-nums text-brand-dark">
                  {formatCurrency(confirmedOrder.total)}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90"
          >
            Volver al catálogo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900 sm:px-6 sm:py-12 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-brand-purple">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark">
          Tu pedido
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
          Confirmá tu pedido
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Completá tus datos de entrega y elegí cómo preferís pagar. Al confirmar,
          registraremos tu pedido y te contactaremos por WhatsApp para coordinar
          los siguientes pasos.
        </p>

        {!isHydrated ? (
          <p className="mt-8 rounded-2xl border border-brand-dark/10 bg-brand-light p-6 text-brand-dark">Cargando tu pedido...</p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-brand-dark/10 bg-brand-light px-6 py-10 text-center sm:p-10">
            <h2 className="text-xl font-semibold text-brand-dark">
              Tu carrito está vacío
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Agregá productos del catálogo antes de confirmar un pedido.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90"
            >
              Ver catálogo
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <form
              className="min-w-0 rounded-2xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-6">
                <label
                  className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
                  aria-hidden="true"
                >
                  Website
                  <input
                    type="text"
                    name="website"
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Nombre completo
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    onBlur={() => touchField("name")}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    autoComplete="name"
                  />
                  {getFieldError("name") ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {getFieldError("name")}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Teléfono / WhatsApp
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value)
                    }
                    onBlur={() => touchField("phone")}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    autoComplete="tel"
                  />
                  {getFieldError("phone") ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {getFieldError("phone")}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Zona de entrega
                  </span>
                  <select
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    onBlur={() => touchField("district")}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                  >
                    <option value="">Seleccioná una zona</option>
                    {coverageZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                  {getFieldError("district") ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {getFieldError("district")}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Dirección exacta
                  </span>
                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      updateField("address", event.target.value)
                    }
                    onBlur={() => touchField("address")}
                    className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    autoComplete="street-address"
                  />
                  {getFieldError("address") ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {getFieldError("address")}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Referencias opcionales
                  </span>
                  <input
                    type="text"
                    value={form.references}
                    onChange={(event) =>
                      updateField("references", event.target.value)
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    placeholder="Color de portón, punto cercano, indicaciones"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Notas opcionales del pedido
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    placeholder="Horario preferido o detalle adicional"
                  />
                </label>

                <fieldset>
                  <legend className="text-sm font-semibold text-slate-800">
                    Método de pago
                  </legend>
                  <div className="mt-2 grid gap-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className="flex min-w-0 cursor-pointer gap-3 rounded-xl border border-brand-dark/20 p-4 transition has-[:checked]:border-brand-dark has-[:checked]:bg-brand-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-purple"
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={form.paymentMethod === method.id}
                          onChange={(event) =>
                            updateField(
                              "paymentMethod",
                              event.target.value as PaymentMethodId,
                            )
                          }
                          onBlur={() => touchField("paymentMethod")}
                          className="mt-1"
                        />
                        <span>
                          <span className="block break-words font-semibold text-brand-dark">
                            {method.label}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">
                            {method.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {getFieldError("paymentMethod") ? (
                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {getFieldError("paymentMethod")}
                    </p>
                  ) : null}
                </fieldset>
              </div>

              {submitError ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-6 min-h-11 w-full rounded-xl bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:bg-slate-200"
              >
                {isSubmitting ? "Registrando pedido..." : "Confirmar pedido"}
              </button>
            </form>

            <aside className="h-fit min-w-0 rounded-2xl border border-brand-dark/10 bg-brand-light p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-brand-dark">
                Resumen de tu pedido
              </h2>
              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex flex-wrap justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="break-words font-medium text-brand-dark">
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {item.quantity} x {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-brand-dark">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-brand-dark/15 pt-4 text-sm text-slate-600">
                <div className="flex flex-wrap justify-between gap-3">
                  <span>Productos</span>
                  <span className="break-words font-medium text-brand-dark">
                    {totalItems}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-3">
                  <span>Entrega</span>
                  <span className="font-medium text-brand-dark">Gratis</span>
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-brand-dark/15 pt-3 text-base">
                  <span className="font-semibold text-brand-dark">Total</span>
                  <span className="break-words font-bold tabular-nums text-brand-dark">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Revisá los productos y el importe antes de confirmar. Al registrar
                el pedido, validaremos los precios y la disponibilidad.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
