import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const adminRoles = new Set(["admin", "operator"]);

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  error?: string,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, getResponse } = createMiddlewareClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const response = getResponse();

  if (pathname === "/admin/login") {
    return response;
  }

  console.log("[admin middleware] Auth check", {
    pathname,
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    email: user?.email ?? null,
    authError: authError
      ? {
          message: authError.message,
          status: authError.status,
        }
      : null,
  });

  if (!user) {
    return redirectWithCookies(request, response, "/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  console.log("[admin middleware] Profile check", {
    userId: user.id,
    hasProfile: Boolean(profile),
    role: profile?.role ?? null,
    profileError: error
      ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      : null,
  });

  if (error) {
    console.error("Failed to load admin profile in middleware", error);

    return redirectWithCookies(
      request,
      response,
      "/admin/login",
      "unauthorized",
    );
  }

  if (!profile || !adminRoles.has(profile.role as string)) {
    return redirectWithCookies(
      request,
      response,
      "/admin/login",
      "unauthorized",
    );
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
