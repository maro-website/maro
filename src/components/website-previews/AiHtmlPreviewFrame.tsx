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

function previewRevision(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

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
  const previewDocument = React.useMemo(
    () => wrapAiPreviewDocument(html, editable ? { channel, selectedPath } : undefined),
    [channel, editable, html, selectedPath]
  );
  const runtimeSrc = React.useMemo(
    () => `/preview-runtime?channel=${encodeURIComponent(channel)}&revision=${previewRevision(previewDocument)}`,
    [channel, previewDocument]
  );

  React.useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data as { source?: string; channel?: string; type?: string } | null;
      if (
        message?.source === "maro-preview-runtime" &&
        message.channel === channel &&
        message.type === "ready"
      ) {
        frameRef.current?.contentWindow?.postMessage(
          { source: "maro-preview-host", channel, type: "render", html: previewDocument },
          "*"
        );
        return;
      }
      if (!editable || !onElementSelect) return;
      if (!isHtmlEditorBridgeMessage(event.data, channel)) return;
      onElementSelect(event.data.selection);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [channel, editable, onElementSelect, previewDocument]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      src={runtimeSrc}
      sandbox={AI_HTML_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
    />
  );
}
