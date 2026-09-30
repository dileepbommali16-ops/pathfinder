import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns the signed-in user from the request context", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result?.openId).toBe("sample-user");
    expect(result?.email).toBe("sample@example.com");
  });
});

describe("placement.records", () => {
  it("accepts dashboard filters and returns a record list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.placement.records({ year: "2015", gender: "Female" });

    expect(Array.isArray(result)).toBe(true);
    expect(result.every((record) => record.year === 2015 && record.gender === "Female")).toBe(true);
  });

  it("returns only cohorts that contain both AIML and Python skills", async () => {
    const result = await appRouter.createCaller(createAuthContext().ctx).placement.records({ year: "2026", skillCategory: "AIML + Python" });

    expect(result.length).toBeGreaterThan(0);
    const groups = new Map<string, Set<string>>();
    result.forEach((record) => {
      const key = `${record.year}|${record.branch}|${record.gender}`;
      const skills = groups.get(key) ?? new Set<string>();
      skills.add(record.skillCategory);
      groups.set(key, skills);
    });
    expect(result.every((record) => record.skillCategory === "AIML" || record.skillCategory === "Python")).toBe(true);
    expect(Array.from(groups.values()).every((skills) => skills.has("AIML") && skills.has("Python"))).toBe(true);
  });
});

describe("placement.uploadCsv and resume.analyze", () => {
  it("rejects CSV uploads from non-admin users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.placement.uploadCsv({ content: "year,branch\n2015,CSE" })).rejects.toThrow();
  });

  it("rejects resumes that are too short to analyze", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.resume.analyze({ resumeText: "Too short" })).rejects.toThrow();
  });
});
