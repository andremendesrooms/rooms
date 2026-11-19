import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-rooms-admin",
    request.nextUrl.pathname.startsWith("/admin") ? "true" : "false",
  );
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
