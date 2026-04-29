import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/notion", () => ({
  saveItem: vi.fn().mockResolvedValue({
    id: "item-1",
    title: "Test Page",
    url: "https://example.com",
    images: [],
    tags: [],
    comment: "",
    createdAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/og", () => ({
  fetchOgData: vi.fn().mockResolvedValue({ title: "Test Page", imageUrl: null }),
}));

import { POST } from "../route";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ url: "https://example.com" }),
  });
}

describe("POST /api/save — API key guard", () => {
  beforeEach(() => {
    process.env.SAVE_API_KEY = "test-secret-key-abc123";
  });

  afterEach(() => {
    delete process.env.SAVE_API_KEY;
  });

  it("returns 401 when x-api-key header is absent", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when x-api-key header is wrong", async () => {
    const res = await POST(makeRequest({ "x-api-key": "wrong-key" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 201 when x-api-key matches SAVE_API_KEY", async () => {
    const res = await POST(makeRequest({ "x-api-key": "test-secret-key-abc123" }));
    expect(res.status).toBe(201);
  });

  it("returns 401 when SAVE_API_KEY env var is not set", async () => {
    delete process.env.SAVE_API_KEY;
    const res = await POST(makeRequest({ "x-api-key": "any-key" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });
});
