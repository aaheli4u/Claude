import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function noAnonWork() {
  mockGetAnonWorkData.mockReturnValue(null);
}

function anonWorkWithMessages(messages = [{ id: "1", role: "user", content: "hi" }]) {
  mockGetAnonWorkData.mockReturnValue({ messages, fileSystemData: { "/": {} } });
}

function anonWorkEmpty() {
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInAction.mockResolvedValue({ success: true });
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-proj-id" });
    noAnonWork();
  });

  // ── isLoading ──────────────────────────────────────────────────────────────

  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true during signIn and false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignInAction.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));
    noAnonWork();
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("a@b.com", "pass1234"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: true }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading is true during signUp and false after", async () => {
    let resolveSignUp!: (v: unknown) => void;
    mockSignUpAction.mockReturnValue(new Promise((res) => { resolveSignUp = res; }));
    noAnonWork();
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signUp("a@b.com", "pass1234"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignUp({ success: true }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading resets to false even when signIn throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.signIn("a@b.com", "pass")).rejects.toThrow("network error");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading resets to false even when signUp throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.signUp("a@b.com", "pass")).rejects.toThrow("network error");
    });

    expect(result.current.isLoading).toBe(false);
  });

  // ── signIn — action forwarding ─────────────────────────────────────────────

  test("signIn calls signInAction with email and password", async () => {
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "secret123"); });

    expect(mockSignInAction).toHaveBeenCalledOnce();
    expect(mockSignInAction).toHaveBeenCalledWith("user@example.com", "secret123");
  });

  test("signIn returns the result from signInAction on success", async () => {
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("signIn returns the result from signInAction on failure", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  // ── signUp — action forwarding ─────────────────────────────────────────────

  test("signUp calls signUpAction with email and password", async () => {
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@example.com", "mypassword"); });

    expect(mockSignUpAction).toHaveBeenCalledOnce();
    expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "mypassword");
  });

  test("signUp returns the result from signUpAction on success", async () => {
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "mypassword");
    });

    expect(returnValue).toEqual({ success: true });
  });

  test("signUp returns the result from signUpAction on failure", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("taken@example.com", "pass");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
  });

  // ── post-sign-in: failed auth skips navigation ─────────────────────────────

  test("signIn does not navigate when action returns success: false", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "bad"); });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("signUp does not navigate when action returns success: false", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "pass"); });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // ── post-sign-in: anon work present ───────────────────────────────────────

  test("migrates anon work: creates project with messages and redirects", async () => {
    const messages = [{ id: "1", role: "user", content: "build a button" }];
    const fileSystemData = { "/": {}, "/App.jsx": { content: "<div/>" } };
    mockGetAnonWorkData.mockReturnValue({ messages, fileSystemData });
    mockCreateProject.mockResolvedValue({ id: "migrated-proj" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages, data: fileSystemData })
    );
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
  });

  test("migrates anon work: project name contains current time string", async () => {
    anonWorkWithMessages();
    mockCreateProject.mockResolvedValue({ id: "x" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    const [{ name }] = mockCreateProject.mock.calls[0];
    expect(name).toMatch(/Design from /);
  });

  test("migrates anon work: does NOT call getProjects", async () => {
    anonWorkWithMessages();
    mockCreateProject.mockResolvedValue({ id: "x" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("signUp also migrates anon work on success", async () => {
    anonWorkWithMessages();
    mockCreateProject.mockResolvedValue({ id: "signup-migrated" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/signup-migrated");
  });

  // ── post-sign-in: anon work with empty messages ────────────────────────────

  test("treats anon work with empty messages array as no anon work", async () => {
    anonWorkEmpty();
    mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  // ── post-sign-in: no anon work, existing projects ─────────────────────────

  test("redirects to the most recent project when user has projects", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([
      { id: "recent-proj" },
      { id: "older-proj" },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("does not create a new project when existing projects are found", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  // ── post-sign-in: no anon work, no existing projects ──────────────────────

  test("creates a new empty project when user has no projects", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("new project name contains 'New Design'", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "x" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "pass"); });

    const [{ name }] = mockCreateProject.mock.calls[0];
    expect(name).toMatch(/New Design/);
  });

  test("signUp also creates a new project when user has none", async () => {
    noAnonWork();
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "signup-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "pass"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/signup-new");
  });
});
