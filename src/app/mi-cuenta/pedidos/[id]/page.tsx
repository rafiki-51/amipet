import Link from "next/link";
import { CustomerOrderDetailClient } from "./CustomerOrderDetailClient";

type CustomerOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerOrderDetailPage({
  params,
}: CustomerOrderDetailPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/pedidos"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Volver a mis pedidos
          </Link>
        </div>

        <CustomerOrderDetailClient orderId={id} />
      </div>
    </main>
  );
}
