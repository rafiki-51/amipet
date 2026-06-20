import "server-only";

import { NextResponse } from "next/server";
import { isCustomerRole } from "@/lib/auth/roles";
import { getAuthenticatedUserRole } from "@/lib/auth/server";

type CustomerApiUserResult =
  | {
      user: {
        id: string;
      };
    }
  | {
      response: NextResponse;
    };

export async function getCustomerApiUser(): Promise<CustomerApiUserResult> {
  const authResult = await getAuthenticatedUserRole();

  if (authResult.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (authResult.status === "profile-error") {
    console.error("Failed to validate customer API profile", authResult.error);

    return {
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      ),
    };
  }

  if (
    authResult.status !== "authenticated" ||
    !isCustomerRole(authResult.role)
  ) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: authResult.user };
}
