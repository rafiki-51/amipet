import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const adminRoles = new Set(["admin", "operator"]);

type AdminApiUserResult =
  | {
      user: {
        id: string;
      };
    }
  | {
      response: NextResponse;
    };

export async function getAdminApiUser(): Promise<AdminApiUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
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
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}

export async function requireAdminApiSession() {
  const authResult = await getAdminApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  return null;
}
