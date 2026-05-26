"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { paymentMethods, type PaymentMethodId } from "@/config/payment";
import { siteConfig } from "@/config/site";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";
import type { OrderItem } from "@/types/order";

const lastOrderStorageKey = "amipet-last-order";

type CheckoutForm = {
  name: string;
  phone: string;
  district: string;
  address: string;
  references: string;
  notes: string;
  paymentMethod: PaymentMethodId | "";
};

type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;
type CheckoutTouched = Partial<Record<keyof CheckoutForm, boolean>>;

type LocalOrder = {
  id: string;
  customer: {
    name: string;
    phone: string;
    district: string;
    address: string;
    references?: string;
  };
  items: OrderItem[];
  paymentMethod: PaymentMethodId;
  status: "recibido";
  subtotal: number;
  deliveryFee: 0;
  total: number;
  notes?: string;
  createdAt: string;
};

const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  district: "",
  address: "",
  references: "",
  notes: "",
  paymentMethod: "",
};

function countPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "").length;
}

function validateForm(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (form.name.trim().length < 3) {
    errors.name = "Ingresá tu nombre completo.";
  }

  if (countPhoneDigits(form.phone) < 8) {
    errors.phone = "Ingresá un teléfono o WhatsApp válido.";
  }

  if (!siteConfig.coverage.includes(form.district)) {
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

function saveLastOrder(order: LocalOrder) {
  try {
    window.localStorage.setItem(lastOrderStorageKey, JSON.stringify(order));
  } catch {
    // The confirmation still works even if local storage is unavailable.
  }
}

export default function CheckoutPage() {
  const { items, totalItems, subtotal, isHydrated, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [touched, setTouched] = useState<CheckoutTouched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<LocalOrder | null>(null);

  const errors = useMemo(() => validateForm(form), [form]);
  const isFormValid = Object.keys(errors).length === 0;
  const canConfirm = isHydrated && items.length > 0 && isFormValid;

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!canConfirm || form.paymentMethod === "") {
      return;
    }

    const orderItems = items.map<OrderItem>((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity,
    }));

    const order: LocalOrder = {
      id: `AMI-${Date.now()}`,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        district: form.district,
        address: form.address.trim(),
        references: form.references.trim() || undefined,
      },
      items: orderItems,
      paymentMethod: form.paymentMethod,
      status: "recibido",
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    saveLastOrder(order);
    setConfirmedOrder(order);
    clearCart();
  }

  if (confirmedOrder) {
    const selectedPayment = paymentMethods.find(
      (method) => method.id === confirmedOrder.paymentMethod,
    );

    return (
      <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
        <section className="mx-auto max-w-3xl rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Pedido recibido
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Gracias, {confirmedOrder.customer.name}
          </h1>
          <p className="mt-4 text-slate-700">
            Tu número de pedido es{" "}
            <span className="font-bold text-emerald-800">
              {confirmedOrder.id}
            </span>
            .
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Te contactaremos por WhatsApp para coordinar la disponibilidad,
            entrega y los detalles finales del pago.
          </p>

          <div className="mt-8 rounded-xl bg-white p-5 text-left shadow-sm">
            <h2 className="font-semibold text-slate-900">Resumen del pedido</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>Productos</span>
                <span className="font-medium text-slate-900">
                  {confirmedOrder.items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Método de pago</span>
                <span className="text-right font-medium text-slate-900">
                  {selectedPayment?.label}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(confirmedOrder.total)}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/catalogo"
            className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Volver al catálogo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Confirmá tu pedido
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Este checkout funciona como confirmación local MVP. El total se
          validará nuevamente al coordinar el pedido por WhatsApp.
        </p>

        {!isHydrated ? (
          <p className="mt-8 text-slate-600">Cargando checkout...</p>
        ) : items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Tu carrito está vacío
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Agregá productos del catálogo antes de confirmar un pedido.
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ver catálogo
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <form
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-5">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">
                    Nombre completo
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    onBlur={() => touchField("name")}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    autoComplete="name"
                  />
                  {getFieldError("name") ? (
                    <p className="mt-1 text-sm text-red-600">
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
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    autoComplete="tel"
                  />
                  {getFieldError("phone") ? (
                    <p className="mt-1 text-sm text-red-600">
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
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Seleccioná una zona</option>
                    {siteConfig.coverage.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                  {getFieldError("district") ? (
                    <p className="mt-1 text-sm text-red-600">
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
                    className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    autoComplete="street-address"
                  />
                  {getFieldError("address") ? (
                    <p className="mt-1 text-sm text-red-600">
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
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                        className="flex cursor-pointer gap-3 rounded-xl border border-slate-300 p-4 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
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
                          <span className="block font-semibold text-slate-900">
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
                    <p className="mt-1 text-sm text-red-600">
                      {getFieldError("paymentMethod")}
                    </p>
                  ) : null}
                </fieldset>
              </div>

              <button
                type="submit"
                disabled={!canConfirm}
                className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirmar pedido
              </button>
            </form>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Resumen del carrito
              </h2>
              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {item.quantity} x {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Productos</span>
                  <span className="font-medium text-slate-900">
                    {totalItems}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Delivery</span>
                  <span className="font-medium text-emerald-700">Gratis</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                El total mostrado es informativo para este MVP local. La
                confirmación final se coordina por WhatsApp.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
