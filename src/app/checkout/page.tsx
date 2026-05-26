import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { siteConfig } from "@/config/site";
import { getActiveDeliveryZones } from "@/lib/products-db";

export default async function CheckoutPage() {
  let coverageZones = siteConfig.coverage;

  try {
    const deliveryZones = await getActiveDeliveryZones();

    if (deliveryZones.length > 0) {
      coverageZones = deliveryZones.map((zone) => zone.name);
    }
  } catch (error) {
    console.error("Failed to load checkout delivery zones from Supabase", error);
  }

  return <CheckoutClient coverageZones={coverageZones} />;
}
