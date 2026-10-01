import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ orderId: "", signupEnabled: false }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.orderId ? { order: state.orderId } : {}),
}));
vi.mock("@/context/store", () => ({ useMaro: () => ({ user: null, credits: 0, getAccessToken: async () => null }) }));
vi.mock("@/components/app/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/auth/AuthLayout", () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/auth/AuthPanel", () => ({ AuthPanel: () => React.createElement("form", {}, "Signup form") }));
vi.mock("@/lib/config/features", () => ({ isSignupEnabled: () => state.signupEnabled }));

import SignUpPage from "@/app/sign-up/page";
import OrderSuccessPage from "@/app/order/success/page";

describe("production presentation pages", () => {
  it("shows a closed signup state with existing-account navigation and no signup form", () => {
    const html = renderToStaticMarkup(React.createElement(SignUpPage));
    expect(html).toContain("Regjistrimet e reja janë përkohësisht të mbyllura.");
    expect(html).toContain('href="/sign-in"');
    expect(html).not.toMatch(/development|\.env|<form|Regjistrohu/);
  });

  it.each(["", "unknown-order"])("never claims payment success before verification (%s)", (orderId) => {
    state.orderId = orderId;
    const html = renderToStaticMarkup(React.createElement(OrderSuccessPage));
    expect(html).toContain("Nuk u gjet një pagesë e konfirmuar.");
    expect(html).toContain('href="/"');
    expect(html).not.toMatch(/Pagesa u konfirmua|Kreditet u shtuan/);
  });
});
