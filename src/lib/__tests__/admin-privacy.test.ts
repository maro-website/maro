import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminPrivacyProvider, AdminPrivateValue } from "@/components/admin/AdminPrivacy";

describe("admin presentation privacy", () => {
  it("omits private values and their titles before the browser reads the preference", () => {
    const html = renderToStaticMarkup(React.createElement(AdminPrivacyProvider, { account: "admin@example.test" },
      React.createElement(AdminPrivateValue, null,
        React.createElement("span", { title: "Private revenue 987654.32" }, "987654.32"))));
    expect(html).toContain("*****");
    expect(html).not.toContain("987654");
    expect(html).not.toContain("Private revenue");
  });

  it("supports text-only option contents while hiding identities", () => {
    const html = renderToStaticMarkup(React.createElement(AdminPrivacyProvider, { account: "admin@example.test" },
      React.createElement("select", null,
        React.createElement("option", { value: "synthetic-id" },
          React.createElement(AdminPrivateValue, { plain: true }, "private@example.test")))));
    expect(html).toContain('<option value="synthetic-id">*****</option>');
    expect(html).not.toContain("private@example.test");
  });

  it("leaves content outside the admin provider visible", () => {
    const html = renderToStaticMarkup(React.createElement(AdminPrivateValue, null, "Public price 19 EUR"));
    expect(html).toBe("Public price 19 EUR");
  });
});
