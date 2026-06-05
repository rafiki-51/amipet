"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);
const allowedMedicationTypes = new Set([
  "medication",
  "supplement",
  "antiparasitic",
  "vitamin",
  "dermatological",
  "other",
]);
const allowedStatuses = new Set(["active", "completed", "paused", "canceled"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type MedicationFormData = {
  medication_name: string;
  medication_type: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  notes: string | null;
  status: string;
};

type OwnedMedication = {
  id: string;
  status: string;
};

type MedicationFormValidation =
  | {
      status: "valid";
      data: MedicationFormData;
    }
  | {
      status: "error";
      error: "required" | "type" | "date" | "end-date" | "status";
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

function getMedicationsPath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/medicamentos`;
}

function getCreatePath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/medicamentos/nuevo`;
}

function getEditPath(petId: string, medicationId: string) {
  return `/mi-cuenta/mascotas/${petId}/medicamentos/${medicationId}/editar`;
}

function redirectCreateWithError(petId: string, error: string): never {
  redirect(`${getCreatePath(petId)}?error=${error}`);
}

function redirectEditWithError(
  petId: string,
  medicationId: string,
  error: string,
): never {
  redirect(`${getEditPath(petId, medicationId)}?error=${error}`);
}

function redirectListWithError(petId: string, error: string): never {
  redirect(`${getMedicationsPath(petId)}?error=${error}`);
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

async function requireCustomerUser(redirectPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${redirectPath}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Failed to validate pet medication owner profile",
      profileError,
    );
    return { supabase, user, profile: null, profileError };
  }

  if (profile && adminRoles.has(profile.role as string)) {
    redirect("/admin/pedidos");
  }

  if (!profile || profile.role !== "customer") {
    redirect("/login");
  }

  return { supabase, user, profile, profileError: null };
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
    console.error("Failed to validate pet ownership for medication", error);
    return { pet: null, error };
  }

  return { pet, error: null };
}

async function requireOwnedMedication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  medicationId: string,
) {
  const { data: medication, error } = await supabase
    .from("pet_medications")
    .select("id, status")
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle<OwnedMedication>();

  if (error) {
    console.error("Failed to validate pet medication ownership", error);
    return { medication: null, error };
  }

  return { medication, error: null };
}

function validateMedicationForm(
  formData: FormData,
  validateStatus = true,
): MedicationFormValidation {
  const medicationName = getString(formData, "medication_name");
  const medicationType = getString(formData, "medication_type");
  const startDate = getString(formData, "start_date");
  const endDate = getOptionalString(formData, "end_date");
  const status = getString(formData, "status") || "active";

  if (!medicationName || !medicationType || !startDate) {
    return { status: "error", error: "required" };
  }

  if (!allowedMedicationTypes.has(medicationType)) {
    return { status: "error", error: "type" };
  }

  const parsedStartDate = parseDate(startDate);

  if (!parsedStartDate) {
    return { status: "error", error: "date" };
  }

  if (endDate) {
    const parsedEndDate = parseDate(endDate);

    if (!parsedEndDate || parsedEndDate < parsedStartDate) {
      return { status: "error", error: "end-date" };
    }
  }

  if (validateStatus && !allowedStatuses.has(status)) {
    return { status: "error", error: "status" };
  }

  return {
    status: "valid",
    data: {
      medication_name: medicationName,
      medication_type: medicationType,
      dosage: getOptionalString(formData, "dosage"),
      frequency: getOptionalString(formData, "frequency"),
      route: getOptionalString(formData, "route"),
      start_date: startDate,
      end_date: endDate,
      prescribed_by: getOptionalString(formData, "prescribed_by"),
      notes: getOptionalString(formData, "notes"),
      status,
    },
  };
}

export async function createPetMedication(petId: string, formData: FormData) {
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

  const validation = validateMedicationForm(formData);

  if (validation.status === "error") {
    redirectCreateWithError(petId, validation.error);
  }

  const { error } = await supabase.from("pet_medications").insert({
    pet_id: petId,
    user_id: user.id,
    ...validation.data,
  });

  if (error) {
    console.error("Failed to create pet medication", error);
    redirectCreateWithError(petId, "save");
  }

  redirect(getMedicationsPath(petId));
}

export async function updatePetMedication(
  petId: string,
  medicationId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!medicationId) {
    redirect(getMedicationsPath(petId));
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getEditPath(petId, medicationId),
  );

  if (profileError) {
    redirectEditWithError(petId, medicationId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectEditWithError(petId, medicationId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectEditWithError(petId, medicationId, "archived");
  }

  const { medication, error: medicationError } = await requireOwnedMedication(
    supabase,
    user.id,
    petId,
    medicationId,
  );

  if (medicationError) {
    redirectEditWithError(petId, medicationId, "save");
  }

  if (!medication) {
    redirect(getMedicationsPath(petId));
  }

  const validation = validateMedicationForm(formData, false);

  if (validation.status === "error") {
    redirectEditWithError(petId, medicationId, validation.error);
  }

  const { error } = await supabase
    .from("pet_medications")
    .update({
      ...validation.data,
      status: medication.status,
    })
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update pet medication", error);
    redirectEditWithError(petId, medicationId, "save");
  }

  redirect(getMedicationsPath(petId));
}

export async function deletePetMedication(
  petId: string,
  medicationId: string,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!medicationId) {
    redirectListWithError(petId, "delete");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getMedicationsPath(petId),
  );

  if (profileError) {
    redirectListWithError(petId, "delete");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError || !pet) {
    redirectListWithError(petId, "delete");
  }

  if (pet.archived_at) {
    redirectListWithError(petId, "archived");
  }

  const { medication, error: medicationError } = await requireOwnedMedication(
    supabase,
    user.id,
    petId,
    medicationId,
  );

  if (medicationError || !medication) {
    redirectListWithError(petId, "delete");
  }

  const { error } = await supabase
    .from("pet_medications")
    .delete()
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete pet medication", error);
    redirectListWithError(petId, "delete");
  }

  redirect(getMedicationsPath(petId));
}

export async function completePetMedication(
  petId: string,
  medicationId: string,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!medicationId) {
    redirectListWithError(petId, "complete");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getMedicationsPath(petId),
  );

  if (profileError) {
    redirectListWithError(petId, "complete");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError || !pet) {
    redirectListWithError(petId, "complete");
  }

  if (pet.archived_at) {
    redirectListWithError(petId, "archived");
  }

  const { medication, error: medicationError } = await requireOwnedMedication(
    supabase,
    user.id,
    petId,
    medicationId,
  );

  if (medicationError || !medication) {
    redirectListWithError(petId, "complete");
  }

  const { error } = await supabase
    .from("pet_medications")
    .update({ status: "completed" })
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to complete pet medication", error);
    redirectListWithError(petId, "complete");
  }

  redirect(getMedicationsPath(petId));
}

export async function pausePetMedication(
  petId: string,
  medicationId: string,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!medicationId) {
    redirectListWithError(petId, "pause");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getMedicationsPath(petId),
  );

  if (profileError) {
    redirectListWithError(petId, "pause");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError || !pet) {
    redirectListWithError(petId, "pause");
  }

  if (pet.archived_at) {
    redirectListWithError(petId, "archived");
  }

  const { medication, error: medicationError } = await requireOwnedMedication(
    supabase,
    user.id,
    petId,
    medicationId,
  );

  if (medicationError || !medication) {
    redirectListWithError(petId, "pause");
  }

  const { error } = await supabase
    .from("pet_medications")
    .update({ status: "paused" })
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to pause pet medication", error);
    redirectListWithError(petId, "pause");
  }

  redirect(getMedicationsPath(petId));
}

export async function reopenPetMedication(
  petId: string,
  medicationId: string,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!medicationId) {
    redirectListWithError(petId, "reopen");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getMedicationsPath(petId),
  );

  if (profileError) {
    redirectListWithError(petId, "reopen");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError || !pet) {
    redirectListWithError(petId, "reopen");
  }

  if (pet.archived_at) {
    redirectListWithError(petId, "archived");
  }

  const { medication, error: medicationError } = await requireOwnedMedication(
    supabase,
    user.id,
    petId,
    medicationId,
  );

  if (medicationError || !medication) {
    redirectListWithError(petId, "reopen");
  }

  const { error } = await supabase
    .from("pet_medications")
    .update({ status: "active" })
    .eq("id", medicationId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to reopen pet medication", error);
    redirectListWithError(petId, "reopen");
  }

  redirect(getMedicationsPath(petId));
}
