"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);
const allowedSexValues = new Set(["male", "female", "unknown"]);

function getString(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);
  return value || null;
}

function redirectWithError(error: string): never {
  redirect(`/mi-cuenta/mascotas/nueva?error=${error}`);
}

export async function createPet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mi-cuenta/mascotas/nueva");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to validate pet owner profile", profileError);
    redirectWithError("profile");
  }

  if (profile && adminRoles.has(profile.role as string)) {
    redirect("/admin/pedidos");
  }

  if (!profile || profile.role !== "customer") {
    redirect("/login");
  }

  const name = getString(formData, "name");
  const species = getString(formData, "species");
  const sex = getString(formData, "sex") || "unknown";
  const weightValue = getString(formData, "weight");

  if (!name || !species) {
    redirectWithError("required");
  }

  if (!allowedSexValues.has(sex)) {
    redirectWithError("sex");
  }

  const weight = weightValue ? Number(weightValue) : null;

  if (
    weightValue &&
    (weight === null || !Number.isFinite(weight) || weight < 0)
  ) {
    redirectWithError("weight");
  }

  const { error } = await supabase.from("pets").insert({
    user_id: user.id,
    name,
    species,
    sex,
    breed: getOptionalString(formData, "breed"),
    birth_date: getOptionalString(formData, "birth_date"),
    weight,
    allergies: getOptionalString(formData, "allergies"),
    current_food: getOptionalString(formData, "current_food"),
    care_notes: getOptionalString(formData, "care_notes"),
  });

  if (error) {
    console.error("Failed to create customer pet", error);
    redirectWithError("save");
  }

  redirect("/mi-cuenta/mascotas");
}
