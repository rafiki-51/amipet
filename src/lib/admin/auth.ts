import "server-only";

import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/roles";
import { getAuthenticatedUserRole } from "@/lib/auth/server";

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
  const authResult = await getAuthenticatedUserRole();

  if (authResult.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (authResult.status === "profile-error") {
    console.error("Failed to validate admin API profile", authResult.error);
  }

  if (
    authResult.status !== "authenticated" ||
    !isAdminRole(authResult.role)
  ) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: authResult.user };
}

export async function requireAdminApiSession() {
  const authResult = await getAdminApiUser();

  if ("response" in authResult) {
    return authResult.response;
  }

  return null;
}
