"use client";

import * as React from "react";
import {
  AI_HTML_PREVIEW_SANDBOX,
  wrapAiPreviewDocument,
} from "@/lib/security/aiPreview";
import {
  isHtmlEditorBridgeMessage,
  type HtmlEditorBridgeSelection,
} from "@/lib/editor/htmlVisualEditing";

export function AiHtmlPreviewFrame({
  title,
  html,
  className,
  style,
  editable = false,
  selectedPath,
  onElementSelect,
}: {
  title: string;
  html: string;
  className?: string;
  style?: React.CSSProperties;
  editable?: boolean;
  selectedPath?: number[];
  onElementSelect?: (selection: HtmlEditorBridgeSelection) => void;
}) {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const reactId = React.useId();
  const channel = `maro-editor-${reactId}`;
  const srcDoc = React.useMemo(
    () => wrapAiPreviewDocument(html, editable ? { channel, selectedPath } : undefined),
    [channel, editable, html, selectedPath]
  );

  React.useEffect(() => {
    if (!editable || !onElementSelect) return;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!isHtmlEditorBridgeMessage(event.data, channel)) return;
      onElementSelect(event.data.selection);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [channel, editable, onElementSelect]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox={AI_HTML_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
    />
  );
}
