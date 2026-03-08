export type PetType = "perro" | "gato";

export type ProductCategory =
  | "alimento-seco"
  | "alimento-humedo"
  | "snacks"
  | "accesorios";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  petType: PetType;
  category: ProductCategory;
  weight: string;
  isActive: boolean;
};