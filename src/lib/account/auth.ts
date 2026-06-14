import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    console.error("Failed to validate customer API profile", error);

    return {
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      ),
    };
  }

  if (!profile || profile.role !== "customer") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: { id: user.id } };
}
