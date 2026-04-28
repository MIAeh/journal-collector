import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAuth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("validateAuth", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_TOKEN", "test-secret-token");
  });

  it("returns null for valid token", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer test-secret-token" },
    });
    expect(validateAuth(request)).toBeNull();
  });

  it("returns 401 for missing header", () => {
    const request = new NextRequest("http://localhost/api/test");
    const response = validateAuth(request);
    expect(response?.status).toBe(401);
  });

  it("returns 401 for wrong token", () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    const response = validateAuth(request);
    expect(response?.status).toBe(401);
  });

  it("returns 500 when AUTH_TOKEN not configured", () => {
    vi.stubEnv("AUTH_TOKEN", "");
    const request = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer anything" },
    });
    const response = validateAuth(request);
    expect(response?.status).toBe(500);
  });
});
