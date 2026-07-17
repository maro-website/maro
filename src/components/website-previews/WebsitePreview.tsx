"use client";

import * as React from "react";
import type { Project } from "@/lib/types";
import { previewVars, buttonStyle } from "./theme";
import { renderSection } from "./sections";
import type { EditTarget } from "./Editable";

// Renders Claude-authored full HTML pages inside a sandboxed iframe. Supports
// switching between multiple pages via a small top nav.
function HtmlPreview({
  project,
  fullHeight,
}: {
  project: Pick<Project, "htmlPages" | "activeHtmlPageId">;
  fullHeight: boolean;
}) {
  const pages = project.htmlPages ?? [];
  const [activeId, setActiveId] = React.useState(
    project.activeHtmlPageId ?? pages[0]?.id
  );
  const active = pages.find((p) => p.id === activeId) ?? pages[0];
  if (!active) return null;

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {pages.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-3 py-2">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={
                "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
                (p.id === active.id
                  ? "bg-brand text-brand-fg"
                  : "text-ink-2 hover:bg-surface-2")
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <iframe
        title={active.name}
        srcDoc={active.html}
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="w-full flex-1"
        style={{ border: 0, height: fullHeight ? "calc(100dvh - 50px)" : "78dvh" }}
      />
    </div>
  );
}

// The editor never needs to know if this is local React or (later) a remote
// iframe. Keep the public interface small and swappable.
export interface WebsitePreviewProps {
  project: Pick<
    Project,
    | "theme"
    | "pages"
    | "activePageId"
    | "businessName"
    | "brand"
    | "category"
    | "renderMode"
    | "htmlPages"
    | "activeHtmlPageId"
  >;
  editMode?: boolean;
  selected?: EditTarget | null;
  onSelect?: (t: EditTarget | null) => void;
  className?: string;
  /** Fill more vertical space (used by the standalone preview page). */
  fullHeight?: boolean;
}

export function WebsitePreview({
  project,
  editMode = false,
  selected = null,
  onSelect,
  className,
  fullHeight = false,
}: WebsitePreviewProps) {
  // Max-quality HTML mode: render Claude's document in a sandboxed iframe.
  if (project?.renderMode === "html" && project.htmlPages?.length) {
    return <HtmlPreview project={project} fullHeight={fullHeight} />;
  }

  // Defensive: during Fast Refresh / transient states the project or its pages
  // can momentarily be unavailable. Render nothing rather than crashing.
  if (!project || !project.theme || !project.pages?.length) return null;

  const { theme } = project;
  const page =
    project.pages.find((p) => p.id === project.activePageId) ?? project.pages[0];
  const ctx = { theme, category: project.category, editMode, selected, onSelect };

  return (
    <div
      className={className}
      style={previewVars(theme)}
      onClick={() => editMode && onSelect?.(null)}
    >
      {/* Site header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--line)",
          background: theme.dark
            ? "rgba(13,13,18,0.72)"
            : "rgba(255,255,255,0.72)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "auto",
            padding: "16px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {project.brand.logoUrl ? (
              <img
                src={project.brand.logoUrl}
                alt=""
                style={{ height: 30, width: "auto", objectFit: "contain", borderRadius: 6 }}
              />
            ) : (
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "calc(var(--rad) * .6)",
                  background: "var(--p)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--hf)",
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {project.businessName.charAt(0)}
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--hf)",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.02em",
                color: "var(--tx)",
              }}
            >
              {project.businessName}
            </span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {project.pages.map((p) => (
              <span
                key={p.id}
                style={{
                  fontSize: 14.5,
                  fontWeight: 500,
                  fontFamily: "var(--bf)",
                  color: p.id === page.id ? "var(--tx)" : "var(--muted)",
                }}
              >
                {p.name}
              </span>
            ))}
            <span style={buttonStyle(theme.buttonStyle, "primary", theme)}>
              Kontakt
            </span>
          </nav>
        </div>
      </header>

      {/* Page sections */}
      <main>{page.sections.map((s) => renderSection(s, ctx))}</main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", paddingBlock: 40 }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "auto",
            padding: "0 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--hf)",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--tx)",
            }}
          >
            {project.businessName}
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--bf)" }}>
            © {new Date().getFullYear()} · Maro me Maro
          </span>
        </div>
      </footer>
    </div>
  );
}
