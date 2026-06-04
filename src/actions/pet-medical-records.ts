"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);
const allowedRecordTypes = new Set([
  "consultation",
  "symptom",
  "diagnosis",
  "treatment",
  "procedure",
  "surgery",
  "emergency",
  "exam_result",
  "follow_up",
  "note",
  "other",
]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type MedicalRecordFormData = {
  record_type: string;
  title: string;
  occurred_at: string;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  clinic_name: string | null;
  veterinarian_name: string | null;
  notes: string | null;
};

type MedicalRecordFormValidation =
  | {
      status: "valid";
      data: MedicalRecordFormData;
    }
  | {
      status: "error";
      error: "required" | "type" | "date" | "future-date";
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

function getMedicalRecordsPath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/historial-medico`;
}

function getCreatePath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/historial-medico/nuevo`;
}

function getEditPath(petId: string, recordId: string) {
  return `/mi-cuenta/mascotas/${petId}/historial-medico/${recordId}/editar`;
}

function redirectCreateWithError(petId: string, error: string): never {
  redirect(`${getCreatePath(petId)}?error=${error}`);
}

function redirectEditWithError(
  petId: string,
  recordId: string,
  error: string,
): never {
  redirect(`${getEditPath(petId, recordId)}?error=${error}`);
}

function redirectListWithError(petId: string, error: string): never {
  redirect(`${getMedicalRecordsPath(petId)}?error=${error}`);
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
      "Failed to validate pet medical record owner profile",
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
    console.error("Failed to validate pet ownership for medical record", error);
    return { pet: null, error };
  }

  return { pet, error: null };
}

async function requireOwnedMedicalRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  recordId: string,
) {
  const { data: record, error } = await supabase
    .from("pet_medical_records")
    .select("id")
    .eq("id", recordId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate pet medical record ownership", error);
    return { record: null, error };
  }

  return { record, error: null };
}

function validateMedicalRecordForm(
  formData: FormData,
): MedicalRecordFormValidation {
  const recordType = getString(formData, "record_type");
  const title = getString(formData, "title");
  const occurredAt = getString(formData, "occurred_at");

  if (!recordType || !title || !occurredAt) {
    return { status: "error", error: "required" };
  }

  if (!allowedRecordTypes.has(recordType)) {
    return { status: "error", error: "type" };
  }

  const occurredDate = parseDate(occurredAt);

  if (!occurredDate) {
    return { status: "error", error: "date" };
  }

  if (occurredDate > getTodayUtc()) {
    return { status: "error", error: "future-date" };
  }

  return {
    status: "valid",
    data: {
      record_type: recordType,
      title,
      occurred_at: occurredAt,
      symptoms: getOptionalString(formData, "symptoms"),
      diagnosis: getOptionalString(formData, "diagnosis"),
      treatment: getOptionalString(formData, "treatment"),
      clinic_name: getOptionalString(formData, "clinic_name"),
      veterinarian_name: getOptionalString(formData, "veterinarian_name"),
      notes: getOptionalString(formData, "notes"),
    },
  };
}

export async function createPetMedicalRecord(
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

  const validation = validateMedicalRecordForm(formData);

  if (validation.status === "error") {
    redirectCreateWithError(petId, validation.error);
  }

  const { error } = await supabase.from("pet_medical_records").insert({
    pet_id: petId,
    user_id: user.id,
    ...validation.data,
  });

  if (error) {
    console.error("Failed to create pet medical record", error);
    redirectCreateWithError(petId, "save");
  }

  redirect(getMedicalRecordsPath(petId));
}

export async function updatePetMedicalRecord(
  petId: string,
  recordId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!recordId) {
    redirect(getMedicalRecordsPath(petId));
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getEditPath(petId, recordId),
  );

  if (profileError) {
    redirectEditWithError(petId, recordId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectEditWithError(petId, recordId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectEditWithError(petId, recordId, "archived");
  }

  const { record, error: recordError } = await requireOwnedMedicalRecord(
    supabase,
    user.id,
    petId,
    recordId,
  );

  if (recordError) {
    redirectEditWithError(petId, recordId, "save");
  }

  if (!record) {
    redirect(getMedicalRecordsPath(petId));
  }

  const validation = validateMedicalRecordForm(formData);

  if (validation.status === "error") {
    redirectEditWithError(petId, recordId, validation.error);
  }

  const { error } = await supabase
    .from("pet_medical_records")
    .update(validation.data)
    .eq("id", recordId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update pet medical record", error);
    redirectEditWithError(petId, recordId, "save");
  }

  redirect(getMedicalRecordsPath(petId));
}

export async function deletePetMedicalRecord(petId: string, recordId: string) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!recordId) {
    redirectListWithError(petId, "delete");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getMedicalRecordsPath(petId),
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

  const { record, error: recordError } = await requireOwnedMedicalRecord(
    supabase,
    user.id,
    petId,
    recordId,
  );

  if (recordError || !record) {
    redirectListWithError(petId, "delete");
  }

  const { error } = await supabase
    .from("pet_medical_records")
    .delete()
    .eq("id", recordId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete pet medical record", error);
    redirectListWithError(petId, "delete");
  }

  redirect(getMedicalRecordsPath(petId));
}
