import "server-only";

import { redirect } from "next/navigation";
import { isAdminRole, isCustomerRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type RequireCustomerPageUserOptions = {
  redirectPath: string;
  profileErrorLogMessage: string;
  unauthenticatedRedirectPath?: string;
};

export async function requireCustomerPageUser({
  redirectPath,
  profileErrorLogMessage,
  unauthenticatedRedirectPath,
}: RequireCustomerPageUserOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(unauthenticatedRedirectPath ?? `/login?redirect=${redirectPath}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileErrorLogMessage, profileError);
  }

  if (profile && isAdminRole(profile.role)) {
    redirect("/admin/pedidos");
  }

  if (!profile || !isCustomerRole(profile.role)) {
    redirect("/login");
  }

  return { supabase, user, profile, profileError: null };
}
