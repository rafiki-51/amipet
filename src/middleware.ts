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
  } = await supabase.auth.getUser();
  const response = getResponse();

  if (pathname === "/admin/login") {
    return response;
  }

  if (!user) {
    return redirectWithCookies(request, response, "/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

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
