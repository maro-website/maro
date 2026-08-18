"use client";

import * as React from "react";
import {
  AI_HTML_PREVIEW_SANDBOX,
  wrapAiPreviewDocument,
} from "@/lib/security/aiPreview";

export function AiHtmlPreviewFrame({
  title,
  html,
  className,
  style,
}: {
  title: string;
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const srcDoc = React.useMemo(() => wrapAiPreviewDocument(html), [html]);

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox={AI_HTML_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
    />
  );
}
