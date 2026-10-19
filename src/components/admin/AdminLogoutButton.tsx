"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/browser";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted && profile && isAdminRole(profile.role)) {
        setIsVisible(true);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      className="min-h-11 shrink-0 rounded-xl border border-brand-dark/20 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-purple disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100"
    >
      {isSigningOut ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}
