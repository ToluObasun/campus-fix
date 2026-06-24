import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key_at_least_32_characters_long"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  // If no token is present, redirect to the login/register landing page
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    // Cryptographically verify the session token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Role-based route containment
    if (pathname.startsWith("/dashboard/admin") && role !== "Admin") {
      // Redirect Requestors and FieldTechnicians back to the general dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (pathname.startsWith("/dashboard/tech") && role !== "FieldTechnician" && role !== "Admin") {
      // Redirect Requestors back to the general dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // If token verification fails, delete the cookie and redirect to login
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("session_token");
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
