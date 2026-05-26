import { supabase } from "@/lib/supabase/client";
import type { Product } from "@/types/product";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  pet_type: Product["petType"];
  category: Product["category"];
  weight: string | null;
  is_active: boolean;
};

export type DeliveryZone = {
  id: string;
  name: string;
  deliveryFee: number;
};

const productSelect = `
  id,
  slug,
  name,
  description,
  price,
  image_url,
  stock,
  pet_type,
  category,
  weight,
  is_active
`;

function mapProductRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    image: row.image_url ?? "",
    stock: row.stock,
    petType: row.pet_type,
    category: row.category,
    weight: row.weight ?? "",
    isActive: row.is_active,
  };
}

export async function getActiveProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return (data as ProductRow[]).map(mapProductRowToProduct);
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProductRowToProduct(data as ProductRow) : null;
}

export async function getActiveDeliveryZones() {
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, delivery_fee")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return data.map((zone) => ({
    id: zone.id as string,
    name: zone.name as string,
    deliveryFee: zone.delivery_fee as number,
  }));
}
