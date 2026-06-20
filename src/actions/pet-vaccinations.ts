"use server";

import { redirect } from "next/navigation";
import { requireCustomerActionUser } from "@/lib/auth/customer-actions";
import { createClient } from "@/lib/supabase/server";

const allowedStatuses = new Set(["applied", "scheduled", "skipped"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type VaccinationFormData = {
  vaccine_name: string;
  administered_at: string;
  next_due_at: string | null;
  clinic_name: string | null;
  veterinarian_name: string | null;
  batch_number: string | null;
  notes: string | null;
  status: string;
};

type OwnedVaccination = {
  id: string;
  status: string;
};

type VaccinationFormValidation =
  | {
      status: "valid";
      data: VaccinationFormData;
    }
  | {
      status: "error";
      error:
        | "required"
        | "date"
        | "future-date"
        | "next-due-date"
        | "status";
    };

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

function getVaccinationsPath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/vacunas`;
}

function getCreatePath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/vacunas/nueva`;
}

function getEditPath(petId: string, vaccinationId: string) {
  return `/mi-cuenta/mascotas/${petId}/vacunas/${vaccinationId}/editar`;
}

function redirectCreateWithError(petId: string, error: string): never {
  redirect(`${getCreatePath(petId)}?error=${error}`);
}

function redirectEditWithError(
  petId: string,
  vaccinationId: string,
  error: string,
): never {
  redirect(`${getEditPath(petId, vaccinationId)}?error=${error}`);
}

function redirectDeleteWithError(petId: string): never {
  redirect(`${getVaccinationsPath(petId)}?error=delete`);
}

function parseDate(value: string) {
  if (!datePattern.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function getTodayUtc() {
  const today = new Date();

  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}

async function requireCustomerUser(redirectPath: string) {
  return requireCustomerActionUser({
    redirectPath,
    profileErrorLogMessage: "Failed to validate pet vaccination owner profile",
  });
}

async function requireActiveOwnedPet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
) {
  const { data: pet, error } = await supabase
    .from("pets")
    .select("id, archived_at")
    .eq("id", petId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate pet ownership for vaccination", error);
    return { pet: null, error };
  }

  return { pet, error: null };
}

async function requireOwnedVaccination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  vaccinationId: string,
) {
  const { data: vaccination, error } = await supabase
    .from("pet_vaccinations")
    .select("id, status")
    .eq("id", vaccinationId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle<OwnedVaccination>();

  if (error) {
    console.error("Failed to validate pet vaccination ownership", error);
    return { vaccination: null, error };
  }

  return { vaccination, error: null };
}

function validateVaccinationForm(
  formData: FormData,
  statusOverride?: string,
): VaccinationFormValidation {
  const vaccineName = getString(formData, "vaccine_name");
  const administeredAt = getString(formData, "administered_at");
  const nextDueAt = getOptionalString(formData, "next_due_at");
  const status = statusOverride ?? (getString(formData, "status") || "applied");

  if (!vaccineName || !administeredAt) {
    return { status: "error", error: "required" };
  }

  if (!allowedStatuses.has(status)) {
    return { status: "error", error: "status" };
  }

  const administeredDate = parseDate(administeredAt);

  if (!administeredDate) {
    return { status: "error", error: "date" };
  }

  if (status === "applied" && administeredDate > getTodayUtc()) {
    return { status: "error", error: "future-date" };
  }

  if (nextDueAt) {
    const nextDueDate = parseDate(nextDueAt);

    if (!nextDueDate || nextDueDate < administeredDate) {
      return { status: "error", error: "next-due-date" };
    }
  }

  return {
    status: "valid",
    data: {
      vaccine_name: vaccineName,
      administered_at: administeredAt,
      next_due_at: nextDueAt,
      clinic_name: getOptionalString(formData, "clinic_name"),
      veterinarian_name: getOptionalString(formData, "veterinarian_name"),
      batch_number: getOptionalString(formData, "batch_number"),
      notes: getOptionalString(formData, "notes"),
      status,
    },
  };
}

export async function createPetVaccination(
  petId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getCreatePath(petId),
  );

  if (profileError) {
    redirectCreateWithError(petId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectCreateWithError(petId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectCreateWithError(petId, "archived");
  }

  const validation = validateVaccinationForm(formData);

  if (validation.status === "error") {
    redirectCreateWithError(petId, validation.error);
  }

  const { error } = await supabase.from("pet_vaccinations").insert({
    pet_id: petId,
    user_id: user.id,
    ...validation.data,
  });

  if (error) {
    console.error("Failed to create pet vaccination", error);
    redirectCreateWithError(petId, "save");
  }

  redirect(getVaccinationsPath(petId));
}

export async function updatePetVaccination(
  petId: string,
  vaccinationId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!vaccinationId) {
    redirect(getVaccinationsPath(petId));
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getEditPath(petId, vaccinationId),
  );

  if (profileError) {
    redirectEditWithError(petId, vaccinationId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectEditWithError(petId, vaccinationId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectEditWithError(petId, vaccinationId, "archived");
  }

  const { vaccination, error: vaccinationError } = await requireOwnedVaccination(
    supabase,
    user.id,
    petId,
    vaccinationId,
  );

  if (vaccinationError) {
    redirectEditWithError(petId, vaccinationId, "save");
  }

  if (!vaccination) {
    redirect(getVaccinationsPath(petId));
  }

  const validation = validateVaccinationForm(formData, vaccination.status);

  if (validation.status === "error") {
    redirectEditWithError(petId, vaccinationId, validation.error);
  }

  const { error } = await supabase
    .from("pet_vaccinations")
    .update({
      ...validation.data,
      status: vaccination.status,
    })
    .eq("id", vaccinationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update pet vaccination", error);
    redirectEditWithError(petId, vaccinationId, "save");
  }

  redirect(getVaccinationsPath(petId));
}

export async function deletePetVaccination(
  petId: string,
  vaccinationId: string,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!vaccinationId) {
    redirectDeleteWithError(petId);
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getVaccinationsPath(petId),
  );

  if (profileError) {
    redirectDeleteWithError(petId);
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError || !pet) {
    redirectDeleteWithError(petId);
  }

  if (pet.archived_at) {
    redirectDeleteWithError(petId);
  }

  const { vaccination, error: vaccinationError } = await requireOwnedVaccination(
    supabase,
    user.id,
    petId,
    vaccinationId,
  );

  if (vaccinationError || !vaccination) {
    redirectDeleteWithError(petId);
  }

  const { error } = await supabase
    .from("pet_vaccinations")
    .delete()
    .eq("id", vaccinationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete pet vaccination", error);
    redirectDeleteWithError(petId);
  }

  redirect(getVaccinationsPath(petId));
}
