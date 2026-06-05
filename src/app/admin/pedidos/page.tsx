import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { AdminPedidosClient } from "./AdminPedidosClient";

const adminRoles = new Set(["admin", "operator"]);

export default async function AdminPedidosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to validate admin pedidos profile", profileError);
  }

  if (profileError || !profile || !adminRoles.has(profile.role as string)) {
    redirect("/admin/login");
  }

  return <AdminPedidosClient />;
}
