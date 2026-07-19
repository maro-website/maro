"use client";

import * as React from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { ZoomIn, Check } from "lucide-react";

const VIEW = 288; // on-screen crop viewport (px)
const OUT = 512; // exported square size (px)

// A 1:1 avatar cropper. The user drags to reposition and uses the slider to
// zoom; on confirm we render the visible square to a canvas and return a PNG
// data URL.
export function AvatarCropper({
  src,
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  src: string | null;
  open: boolean;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = React.useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Load natural size when the source changes.
  React.useEffect(() => {
    if (!src) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  const baseScale = nat ? VIEW / Math.min(nat.w, nat.h) : 1;
  const dispW = nat ? nat.w * baseScale * scale : VIEW;
  const dispH = nat ? nat.h * baseScale * scale : VIEW;

  const clamp = React.useCallback(
    (x: number, y: number) => {
      const minX = VIEW - dispW;
      const minY = VIEW - dispH;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [dispW, dispH]
  );

  // Re-center/clamp whenever the zoom changes.
  React.useEffect(() => {
    setOffset((o) => {
      // Keep the center fixed while zooming.
      return clamp(o.x, o.y);
    });
  }, [scale, clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clamp(drag.current.ox + dx, drag.current.oy + dy));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = () => {
    if (!nat || !imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const unit = baseScale * scale; // display px per source px
    const srcX = -offset.x / unit;
    const srcY = -offset.y / unit;
    const srcSize = VIEW / unit;
    ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL("image/png"));
  };

  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <ModalHeader
        icon={<ZoomIn className="h-5 w-5" />}
        title="Rregullo foton"
        description="Tërhiq për ta lëvizur, zoom për ta zmadhuar. Prerja është 1:1."
      />
      <div className="flex flex-col items-center px-6 pb-6">
        <div
          className="relative touch-none overflow-hidden rounded-full border border-line bg-surface-2"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && nat && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: offset.x, top: offset.y, width: dispW, height: dispH }}
            />
          )}
          {/* subtle center ring */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-ink/10" />
        </div>

        <div className="mt-5 flex w-full items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand"
          />
        </div>

        <div className="mt-6 flex w-full gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-line-strong bg-surface px-4 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            Anulo
          </button>
          <button
            onClick={confirm}
            disabled={saving || !nat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-brand-fg" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Ruaj foton
          </button>
        </div>
      </div>
    </Modal>
  );
}
