import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

export async function requireAdminApiSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to validate admin API profile", error);
  }

  if (error || !profile || !adminRoles.has(profile.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
