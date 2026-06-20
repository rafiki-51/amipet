"use server";

import { redirect } from "next/navigation";
import { requireCustomerActionUser } from "@/lib/auth/customer-actions";
import { createClient } from "@/lib/supabase/server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type WeightLogFormData = {
  weight: number;
  measured_at: string;
  notes: string | null;
};

type WeightLogFormValidation =
  | {
      status: "valid";
      data: WeightLogFormData;
    }
  | {
      status: "error";
      error: "required" | "weight" | "date";
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

function getCreatePath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/peso/nuevo`;
}

function getEditPath(petId: string, logId: string) {
  return `/mi-cuenta/mascotas/${petId}/peso/${logId}/editar`;
}

function getWeightLogsPath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/peso`;
}

function redirectCreateWithError(petId: string, error: string): never {
  redirect(`${getCreatePath(petId)}?error=${error}`);
}

function redirectEditWithError(
  petId: string,
  logId: string,
  error: string,
): never {
  redirect(`${getEditPath(petId, logId)}?error=${error}`);
}

function redirectDeleteWithError(petId: string): never {
  redirect(`${getWeightLogsPath(petId)}?error=delete`);
}

function parseWeight(value: string) {
  if (!value) {
    return null;
  }

  const weight = Number(value);

  if (!Number.isFinite(weight) || weight <= 0) {
    return null;
  }

  return weight;
}

function isValidMeasuredAt(value: string) {
  if (!datePattern.test(value)) {
    return false;
  }

  const measuredDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(measuredDate.getTime())) {
    return false;
  }

  if (measuredDate.toISOString().slice(0, 10) !== value) {
    return false;
  }

  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  return measuredDate <= todayUtc;
}

async function requireCustomerUser(redirectPath: string) {
  return requireCustomerActionUser({
    redirectPath,
    profileErrorLogMessage: "Failed to validate pet weight log owner profile",
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
    console.error("Failed to validate pet ownership for weight log", error);
    return { pet: null, error };
  }

  return { pet, error: null };
}

async function requireOwnedWeightLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  logId: string,
) {
  const { data: log, error } = await supabase
    .from("pet_weight_logs")
    .select("id")
    .eq("id", logId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate pet weight log ownership", error);
    return { log: null, error };
  }

  return { log, error: null };
}

function validateWeightLogForm(formData: FormData): WeightLogFormValidation {
  const weightValue = getString(formData, "weight");
  const measuredAt = getString(formData, "measured_at");
  const weight = parseWeight(weightValue);

  if (!weightValue || !measuredAt) {
    return { status: "error", error: "required" };
  }

  if (weight === null) {
    return { status: "error", error: "weight" };
  }

  if (!isValidMeasuredAt(measuredAt)) {
    return { status: "error", error: "date" };
  }

  return {
    status: "valid",
    data: {
      weight,
      measured_at: measuredAt,
      notes: getOptionalString(formData, "notes"),
    },
  };
}

export async function createPetWeightLog(petId: string, formData: FormData) {
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

  const validation = validateWeightLogForm(formData);

  if (validation.status === "error") {
    redirectCreateWithError(petId, validation.error);
  }

  const { error } = await supabase.from("pet_weight_logs").insert({
    pet_id: petId,
    user_id: user.id,
    ...validation.data,
  });

  if (error) {
    console.error("Failed to create pet weight log", error);
    redirectCreateWithError(petId, "save");
  }

  redirect(getWeightLogsPath(petId));
}

export async function updatePetWeightLog(
  petId: string,
  logId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!logId) {
    redirect(getWeightLogsPath(petId));
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getEditPath(petId, logId),
  );

  if (profileError) {
    redirectEditWithError(petId, logId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectEditWithError(petId, logId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectEditWithError(petId, logId, "archived");
  }

  const { log, error: logError } = await requireOwnedWeightLog(
    supabase,
    user.id,
    petId,
    logId,
  );

  if (logError) {
    redirectEditWithError(petId, logId, "save");
  }

  if (!log) {
    redirect(getWeightLogsPath(petId));
  }

  const validation = validateWeightLogForm(formData);

  if (validation.status === "error") {
    redirectEditWithError(petId, logId, validation.error);
  }

  const { error } = await supabase
    .from("pet_weight_logs")
    .update(validation.data)
    .eq("id", logId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update pet weight log", error);
    redirectEditWithError(petId, logId, "save");
  }

  redirect(getWeightLogsPath(petId));
}

export async function deletePetWeightLog(petId: string, logId: string) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!logId) {
    redirectDeleteWithError(petId);
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getWeightLogsPath(petId),
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

  const { log, error: logError } = await requireOwnedWeightLog(
    supabase,
    user.id,
    petId,
    logId,
  );

  if (logError || !log) {
    redirectDeleteWithError(petId);
  }

  const { error } = await supabase
    .from("pet_weight_logs")
    .delete()
    .eq("id", logId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete pet weight log", error);
    redirectDeleteWithError(petId);
  }

  redirect(getWeightLogsPath(petId));
}
