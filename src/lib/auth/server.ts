import "server-only";

import { isAppRole, type AppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUserRoleResult =
  | {
      status: "unauthenticated";
    }
  | {
      status: "profile-error";
      error: unknown;
    }
  | {
      status: "missing-profile";
      user: {
        id: string;
      };
    }
  | {
      status: "invalid-role";
      user: {
        id: string;
      };
      role: string;
    }
  | {
      status: "authenticated";
      user: {
        id: string;
      };
      role: AppRole;
    };

export async function getAuthenticatedUserRole(): Promise<AuthenticatedUserRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      status: "profile-error",
      error,
    };
  }

  if (!profile) {
    return {
      status: "missing-profile",
      user: { id: user.id },
    };
  }

  if (!isAppRole(profile.role)) {
    return {
      status: "invalid-role",
      user: { id: user.id },
      role: String(profile.role),
    };
  }

  return {
    status: "authenticated",
    user: { id: user.id },
    role: profile.role,
  };
}
