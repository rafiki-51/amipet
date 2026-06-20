import { getOrderStatusLabel } from "@/components/admin/OrderStatusBadge";
import { orderStatuses } from "@/config/orders";
import { paymentMethods, type PaymentMethodId } from "@/config/payment";
import {
  paymentStatusLabels,
  paymentStatuses,
  type PaymentStatus,
} from "@/config/payment-status";
import type { OrderStatus } from "@/types/order";

export type OrderFilterState = {
  status: OrderStatus | "todos";
  district: string;
  paymentMethod: PaymentMethodId | "todos";
  paymentStatus: PaymentStatus | "todos";
};

type OrderFiltersProps = {
  filters: OrderFilterState;
  zones: string[];
  onChange: (filters: OrderFilterState) => void;
};

export function OrderFilters({ filters, zones, onChange }: OrderFiltersProps) {
  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Estado
        </span>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as OrderFilterState["status"],
            })
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          {orderStatuses.map((status) => (
            <option key={status} value={status}>
              {getOrderStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Zona
        </span>
        <select
          value={filters.district}
          onChange={(event) =>
            onChange({
              ...filters,
              district: event.target.value,
            })
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="todas">Todas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Metodo
        </span>
        <select
          value={filters.paymentMethod}
          onChange={(event) =>
            onChange({
              ...filters,
              paymentMethod: event.target
                .value as OrderFilterState["paymentMethod"],
            })
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Pago
        </span>
        <select
          value={filters.paymentStatus}
          onChange={(event) =>
            onChange({
              ...filters,
              paymentStatus: event.target
                .value as OrderFilterState["paymentStatus"],
            })
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {paymentStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
