import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { DEMO_COOKIE_NAME } from "@/app/demo/helpers"

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.set(DEMO_COOKIE_NAME, "1", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
  })
  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
}
