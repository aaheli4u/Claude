// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

// Mock server-only so it doesn't throw outside Next.js
vi.mock("server-only", () => ({}));

// Build a spy cookie store before the module loads
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ set: mockSet, get: mockGet, delete: mockDelete })
  ),
}));

// Import after mocks are in place
const { createSession } = await import("../auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets a cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("cookie value is a valid signed JWT", async () => {
    await createSession("user-1", "test@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload).toBeDefined();
  });

  test("JWT contains the correct userId and email", async () => {
    await createSession("user-42", "alice@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("alice@example.com");
  });

  test("JWT expires approximately 7 days from now", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "test@example.com");
    const after = Math.floor(Date.now() / 1000);

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysSeconds = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSeconds);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSeconds + 5);
  });

  test("cookie is set with httpOnly, sameSite lax, path /", async () => {
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie is not secure outside production", async () => {
    const original = process.env.NODE_ENV;
    // vitest runs in 'test' environment, not 'production'
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
    process.env.NODE_ENV = original;
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 5000);
  });
});
