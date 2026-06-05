"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);
const allowedReminderTypes = new Set([
  "vaccine",
  "medication",
  "vet_visit",
  "deworming",
  "grooming",
  "feeding",
  "other",
]);
const allowedStatuses = new Set(["pending", "completed", "canceled"]);
const allowedSources = new Set(["manual", "vaccination"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReminderFormData = {
  title: string;
  reminder_type: string;
  due_at: string;
  notes: string | null;
  status: string;
  source: string;
  related_vaccination_id: string | null;
};

type OwnedReminder = {
  id: string;
  status: string;
  source: string;
  related_vaccination_id: string | null;
};

type ReminderFormValidation =
  | {
      status: "valid";
      data: ReminderFormData;
    }
  | {
      status: "error";
      error:
        | "required"
        | "type"
        | "date"
        | "status"
        | "source"
        | "vaccination";
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

function getRemindersPath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/recordatorios`;
}

function getCreatePath(petId: string) {
  return `/mi-cuenta/mascotas/${petId}/recordatorios/nuevo`;
}

function getEditPath(petId: string, reminderId: string) {
  return `/mi-cuenta/mascotas/${petId}/recordatorios/${reminderId}/editar`;
}

function redirectCreateWithError(petId: string, error: string): never {
  redirect(`${getCreatePath(petId)}?error=${error}`);
}

function redirectEditWithError(
  petId: string,
  reminderId: string,
  error: string,
): never {
  redirect(`${getEditPath(petId, reminderId)}?error=${error}`);
}

function redirectListWithError(petId: string, error: string): never {
  redirect(`${getRemindersPath(petId)}?error=${error}`);
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
    console.error("Failed to validate pet reminder owner profile", profileError);
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
    console.error("Failed to validate pet ownership for reminder", error);
    return { pet: null, error };
  }

  return { pet, error: null };
}

async function requireOwnedReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  reminderId: string,
) {
  const { data: reminder, error } = await supabase
    .from("pet_reminders")
    .select("id, status, source, related_vaccination_id")
    .eq("id", reminderId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle<OwnedReminder>();

  if (error) {
    console.error("Failed to validate pet reminder ownership", error);
    return { reminder: null, error };
  }

  return { reminder, error: null };
}

async function requireOwnedVaccination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  vaccinationId: string,
) {
  const { data: vaccination, error } = await supabase
    .from("pet_vaccinations")
    .select("id")
    .eq("id", vaccinationId)
    .eq("pet_id", petId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate related vaccination ownership", error);
    return { vaccination: null, error };
  }

  return { vaccination, error: null };
}

function validateReminderForm(
  formData: FormData,
  validateStateFields = true,
): ReminderFormValidation {
  const title = getString(formData, "title");
  const reminderType = getString(formData, "reminder_type");
  const dueAt = getString(formData, "due_at");
  const status = getString(formData, "status") || "pending";
  const source = getString(formData, "source") || "manual";
  const relatedVaccinationId = getOptionalString(
    formData,
    "related_vaccination_id",
  );

  if (!title || !reminderType || !dueAt) {
    return { status: "error", error: "required" };
  }

  if (!allowedReminderTypes.has(reminderType)) {
    return { status: "error", error: "type" };
  }

  if (!parseDate(dueAt)) {
    return { status: "error", error: "date" };
  }

  if (validateStateFields) {
    if (!allowedStatuses.has(status)) {
      return { status: "error", error: "status" };
    }

    if (!allowedSources.has(source)) {
      return { status: "error", error: "source" };
    }

    if (source === "vaccination" && !relatedVaccinationId) {
      return { status: "error", error: "vaccination" };
    }

    if (relatedVaccinationId && !uuidPattern.test(relatedVaccinationId)) {
      return { status: "error", error: "vaccination" };
    }
  }

  return {
    status: "valid",
    data: {
      title,
      reminder_type: reminderType,
      due_at: dueAt,
      notes: getOptionalString(formData, "notes"),
      status,
      source,
      related_vaccination_id: relatedVaccinationId,
    },
  };
}

async function validateRelatedVaccination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  petId: string,
  vaccinationId: string | null,
) {
  if (!vaccinationId) {
    return { valid: true, error: null };
  }

  const { vaccination, error } = await requireOwnedVaccination(
    supabase,
    userId,
    petId,
    vaccinationId,
  );

  return { valid: Boolean(vaccination) && !error, error };
}

export async function createPetReminder(petId: string, formData: FormData) {
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

  const validation = validateReminderForm(formData);

  if (validation.status === "error") {
    redirectCreateWithError(petId, validation.error);
  }

  const relatedVaccination = await validateRelatedVaccination(
    supabase,
    user.id,
    petId,
    validation.data.related_vaccination_id,
  );

  if (!relatedVaccination.valid) {
    redirectCreateWithError(petId, "vaccination");
  }

  const { error } = await supabase.from("pet_reminders").insert({
    pet_id: petId,
    user_id: user.id,
    ...validation.data,
    completed_at: null,
  });

  if (error) {
    console.error("Failed to create pet reminder", error);
    redirectCreateWithError(petId, "save");
  }

  redirect(getRemindersPath(petId));
}

export async function updatePetReminder(
  petId: string,
  reminderId: string,
  formData: FormData,
) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!reminderId) {
    redirect(getRemindersPath(petId));
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getEditPath(petId, reminderId),
  );

  if (profileError) {
    redirectEditWithError(petId, reminderId, "profile");
  }

  const { pet, error: petError } = await requireActiveOwnedPet(
    supabase,
    user.id,
    petId,
  );

  if (petError) {
    redirectEditWithError(petId, reminderId, "save");
  }

  if (!pet) {
    redirect("/mi-cuenta/mascotas");
  }

  if (pet.archived_at) {
    redirectEditWithError(petId, reminderId, "archived");
  }

  const { reminder, error: reminderError } = await requireOwnedReminder(
    supabase,
    user.id,
    petId,
    reminderId,
  );

  if (reminderError) {
    redirectEditWithError(petId, reminderId, "save");
  }

  if (!reminder) {
    redirect(getRemindersPath(petId));
  }

  const validation = validateReminderForm(formData, false);

  if (validation.status === "error") {
    redirectEditWithError(petId, reminderId, validation.error);
  }

  const { error } = await supabase
    .from("pet_reminders")
    .update({
      ...validation.data,
      status: reminder.status,
      source: reminder.source,
      related_vaccination_id: reminder.related_vaccination_id,
    })
    .eq("id", reminderId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update pet reminder", error);
    redirectEditWithError(petId, reminderId, "save");
  }

  redirect(getRemindersPath(petId));
}

export async function deletePetReminder(petId: string, reminderId: string) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!reminderId) {
    redirectListWithError(petId, "delete");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getRemindersPath(petId),
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

  const { reminder, error: reminderError } = await requireOwnedReminder(
    supabase,
    user.id,
    petId,
    reminderId,
  );

  if (reminderError || !reminder) {
    redirectListWithError(petId, "delete");
  }

  const { error } = await supabase
    .from("pet_reminders")
    .delete()
    .eq("id", reminderId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete pet reminder", error);
    redirectListWithError(petId, "delete");
  }

  redirect(getRemindersPath(petId));
}

export async function completePetReminder(petId: string, reminderId: string) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!reminderId) {
    redirectListWithError(petId, "complete");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getRemindersPath(petId),
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

  const { reminder, error: reminderError } = await requireOwnedReminder(
    supabase,
    user.id,
    petId,
    reminderId,
  );

  if (reminderError || !reminder) {
    redirectListWithError(petId, "complete");
  }

  const { error } = await supabase
    .from("pet_reminders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reminderId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to complete pet reminder", error);
    redirectListWithError(petId, "complete");
  }

  redirect(getRemindersPath(petId));
}

export async function reopenPetReminder(petId: string, reminderId: string) {
  if (!petId) {
    redirect("/mi-cuenta/mascotas");
  }

  if (!reminderId) {
    redirectListWithError(petId, "reopen");
  }

  const { supabase, user, profileError } = await requireCustomerUser(
    getRemindersPath(petId),
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

  const { reminder, error: reminderError } = await requireOwnedReminder(
    supabase,
    user.id,
    petId,
    reminderId,
  );

  if (reminderError || !reminder) {
    redirectListWithError(petId, "reopen");
  }

  const { error } = await supabase
    .from("pet_reminders")
    .update({
      status: "pending",
      completed_at: null,
    })
    .eq("id", reminderId)
    .eq("pet_id", petId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to reopen pet reminder", error);
    redirectListWithError(petId, "reopen");
  }

  redirect(getRemindersPath(petId));
}
