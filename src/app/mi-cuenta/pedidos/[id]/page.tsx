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
    <main className="min-h-screen bg-brand-light/50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/mi-cuenta/pedidos"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-dark transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2"
          >
            Volver a mis pedidos
          </Link>
        </div>

        <CustomerOrderDetailClient orderId={id} />
      </div>
    </main>
  );
}
