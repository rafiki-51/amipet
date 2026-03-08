import type { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: "prod-001",
    slug: "dog-chow-adultos-8kg",
    name: "Dog Chow Adultos 8kg",
    description: "Alimento seco para perro adulto.",
    price: 18500,
    image: "/products/dog-chow-adultos-8kg.jpg",
    stock: 8,
    petType: "perro",
    category: "alimento-seco",
    weight: "8 kg",
    isActive: true,
  },
  {
    id: "prod-002",
    slug: "cat-chow-adultos-1-5kg",
    name: "Cat Chow Adultos 1.5kg",
    description: "Alimento seco para gato adulto.",
    price: 6500,
    image: "/products/cat-chow-adultos-1-5kg.jpg",
    stock: 10,
    petType: "gato",
    category: "alimento-seco",
    weight: "1.5 kg",
    isActive: true,
  },
  {
    id: "prod-003",
    slug: "pedigree-cachorro-4kg",
    name: "Pedigree Cachorro 4kg",
    description: "Alimento seco para cachorro.",
    price: 11200,
    image: "/products/pedigree-cachorro-4kg.jpg",
    stock: 5,
    petType: "perro",
    category: "alimento-seco",
    weight: "4 kg",
    isActive: true,
  },
  {
    id: "prod-004",
    slug: "whiskas-pescado-85g",
    name: "Whiskas Pescado 85g",
    description: "Alimento húmedo para gato.",
    price: 850,
    image: "/products/whiskas-pescado-85g.jpg",
    stock: 20,
    petType: "gato",
    category: "alimento-humedo",
    weight: "85 g",
    isActive: true,
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}