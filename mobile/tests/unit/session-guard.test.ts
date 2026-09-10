import { describe, expect, it } from "vitest";
import { ROUTES, resolveInitialRoute } from "@/lib/session-guard";

describe("resolveInitialRoute", () => {
  it("returns null while the session status is still loading (stay on splash)", () => {
    expect(resolveInitialRoute("loading")).toBeNull();
  });

  it("routes to Discover when authenticated", () => {
    expect(resolveInitialRoute("authenticated")).toBe(ROUTES.discover);
  });

  it("routes to Welcome when unauthenticated", () => {
    expect(resolveInitialRoute("unauthenticated")).toBe(ROUTES.welcome);
  });
});
