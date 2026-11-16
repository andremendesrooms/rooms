import { NextRequest, NextResponse } from "next/server";
import { languages, type Language } from "@/lib/i18n";
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host"))
      return new NextResponse(null, { status: 403 });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
  let language: unknown;
  try {
    language = (await request.json()).language;
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!languages.includes(language as Language))
    return new NextResponse(null, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("rooms-language", language as Language, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
  return response;
}
