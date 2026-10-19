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
    <section className="grid min-w-0 gap-4 rounded-2xl border border-brand-dark/10 bg-white p-4 sm:grid-cols-2">
      <label className="block min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark">
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
          className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
        >
          <option value="todos">Todos</option>
          {orderStatuses.map((status) => (
            <option key={status} value={status}>
              {getOrderStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark">
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
          className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
        >
          <option value="todas">Todas</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark">
          Método
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
          className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
        >
          <option value="todos">Todos</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-0">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark">
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
          className="mt-2 min-h-11 w-full min-w-0 max-w-full rounded-xl border border-brand-dark/25 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/25 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600"
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
