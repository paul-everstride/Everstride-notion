import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const protectedMatchers = ["/dashboard", "/compare", "/athletes", "/me", "/teams"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresAuth = protectedMatchers.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/compare/:path*", "/athletes/:path*", "/me/:path*", "/teams/:path*"]
};
