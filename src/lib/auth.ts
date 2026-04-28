import { NextRequest, NextResponse } from "next/server";

export function validateAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const token = process.env.AUTH_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured: no AUTH_TOKEN" },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
