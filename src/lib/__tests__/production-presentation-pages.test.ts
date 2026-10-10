import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ orderId: "", signupEnabled: false, nextPath: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ ...(state.orderId ? { order: state.orderId } : {}), ...(state.nextPath ? { next: state.nextPath } : {}) }),
}));
vi.mock("@/context/store", () => ({ useMaro: () => ({ user: null, credits: 0, getAccessToken: async () => null }) }));
vi.mock("@/components/app/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/auth/AuthLayout", () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/auth/AuthPanel", () => ({ AuthPanel: () => React.createElement("form", {}, "Signup form") }));
vi.mock("@/lib/config/features", () => ({ isSignupEnabled: () => state.signupEnabled }));

import SignUpPage from "@/app/sign-up/page";
import SignInPage from "@/app/sign-in/page";
import OrderSuccessPage from "@/app/order/success/page";

describe("production presentation pages", () => {
  beforeEach(() => { state.orderId = ""; state.signupEnabled = false; state.nextPath = ""; });
  it("shows a closed signup state with existing-account navigation and no signup form", () => {
    const html = renderToStaticMarkup(React.createElement(SignUpPage));
    expect(html).toContain("Regjistrimet e reja janë përkohësisht të mbyllura.");
    expect(html).toContain('href="/sign-in?next=%2F"');
    expect(html).not.toMatch(/development|\.env|<form|Regjistrohu/);
  });

  it.each([false, true])("retains a personal bonus link when switching authentication pages (signup enabled: %s)", signupEnabled => {
    state.signupEnabled = signupEnabled;
    state.nextPath = "/bonus?code=PERSONAL-20C";
    const destination = encodeURIComponent(state.nextPath);
    expect(renderToStaticMarkup(React.createElement(SignUpPage))).toContain(`href="/sign-in?next=${destination}"`);
    expect(renderToStaticMarkup(React.createElement(SignInPage))).toContain(`href="/sign-up?next=${destination}"`);
  });

  it.each(["", "unknown-order"])("never claims payment success before verification (%s)", (orderId) => {
    state.orderId = orderId;
    const html = renderToStaticMarkup(React.createElement(OrderSuccessPage));
    expect(html).toContain("Nuk u gjet një pagesë e konfirmuar.");
    expect(html).toContain('href="/"');
    expect(html).not.toMatch(/Pagesa u konfirmua|Kreditet u shtuan/);
  });
});
