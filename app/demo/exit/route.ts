import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { DEMO_COOKIE_NAME } from "@/app/demo/helpers"

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete(DEMO_COOKIE_NAME)
  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))
}
