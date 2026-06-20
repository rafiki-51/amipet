"use server";

import { redirect } from "next/navigation";
import { requireCustomerActionUser } from "@/lib/auth/customer-actions";

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

function redirectEditWithError(petId: string, error: string): never {
  redirect(`/mi-cuenta/mascotas/${petId}/editar?error=${error}`);
}

async function requireCustomerUser(redirectPath: string) {
  return requireCustomerActionUser({
    redirectPath,
    profileErrorLogMessage: "Failed to validate pet owner profile",
  });
}

export async function createPet(formData: FormData) {
  const { supabase, user, profileError } = await requireCustomerUser(
    "/mi-cuenta/mascotas/nueva",
  );

  if (profileError) {
    redirectWithError("profile");
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

export async function updatePet(petId: string, formData: FormData) {
  const { supabase, user, profileError } = await requireCustomerUser(
    `/mi-cuenta/mascotas/${petId}/editar`,
  );

  if (profileError) {
    redirectEditWithError(petId, "profile");
  }

  const { data: existingPet, error: existingPetError } = await supabase
    .from("pets")
    .select("id, archived_at")
    .eq("id", petId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPetError) {
    console.error("Failed to validate customer pet ownership", existingPetError);
    redirectEditWithError(petId, "save");
  }

  if (!existingPet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (existingPet.archived_at) {
    redirect(`/mi-cuenta/mascotas/${petId}`);
  }

  const name = getString(formData, "name");
  const species = getString(formData, "species");
  const sex = getString(formData, "sex") || "unknown";
  const weightValue = getString(formData, "weight");

  if (!name || !species) {
    redirectEditWithError(petId, "required");
  }

  if (!allowedSexValues.has(sex)) {
    redirectEditWithError(petId, "sex");
  }

  const weight = weightValue ? Number(weightValue) : null;

  if (
    weightValue &&
    (weight === null || !Number.isFinite(weight) || weight < 0)
  ) {
    redirectEditWithError(petId, "weight");
  }

  const { error } = await supabase
    .from("pets")
    .update({
      name,
      species,
      sex,
      breed: getOptionalString(formData, "breed"),
      birth_date: getOptionalString(formData, "birth_date"),
      weight,
      allergies: getOptionalString(formData, "allergies"),
      current_food: getOptionalString(formData, "current_food"),
      care_notes: getOptionalString(formData, "care_notes"),
    })
    .eq("id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update customer pet", error);
    redirectEditWithError(petId, "save");
  }

  redirect(`/mi-cuenta/mascotas/${petId}`);
}

export async function archivePet(petId: string, formData: FormData) {
  const { supabase, user, profileError } = await requireCustomerUser(
    `/mi-cuenta/mascotas/${petId}`,
  );

  if (profileError) {
    redirect("/mi-cuenta/mascotas");
  }

  const { data: existingPet, error: existingPetError } = await supabase
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPetError) {
    console.error("Failed to validate customer pet ownership", existingPetError);
    redirect("/mi-cuenta/mascotas");
  }

  if (!existingPet) {
    redirect("/mi-cuenta/mascotas");
  }

  const { error } = await supabase
    .from("pets")
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: getOptionalString(formData, "archived_reason"),
    })
    .eq("id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to archive customer pet", error);
  }

  redirect("/mi-cuenta/mascotas");
}
