"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ImageMarkupZone } from "@/lib/ai/image26";

const defaultZone = { x: 0.35, y: 0.35, width: 0.3, height: 0.3 };
const limit = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export function ImageMarkupDialog({ src, initial, onClose, onApply }: {
  src: string;
  initial?: ImageMarkupZone;
  onClose: () => void;
  onApply: (zone: ImageMarkupZone) => void;
}) {
  const [zone, setZone] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const previous = useRef(zone);
  const point = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: limit((event.clientX - bounds.left) / bounds.width), y: limit((event.clientY - bounds.top) / bounds.height) };
  };
  const update = (event: PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return;
    const a = start.current;
    const b = point(event);
    const next = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    setZone(next);
    return next;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const [dx, dy] = direction.map(value => value * 0.025);
    const current = zone ?? defaultZone;
    setZone(event.shiftKey
      ? { ...current, width: limit(current.width + dx, 0.05, 1 - current.x), height: limit(current.height + dy, 0.05, 1 - current.y) }
      : { ...current, x: limit(current.x + dx, 0, 1 - current.width), y: limit(current.y + dy, 0, 1 - current.height) });
  };
  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader title="Shëno zonën" description="Tërhiq me gisht ose me maus për ta rrethuar detajin që do të ndryshosh." />
      <p id="maro-markup-keyboard" className="sr-only">Përdor shigjetat për të lëvizur rrethin. Mbaj Shift dhe përdor shigjetat për ta zmadhuar ose zvogëluar.</p>
      <div className="mt-4 flex justify-center">
        <div className="relative inline-block max-w-full overflow-hidden rounded-maro12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Fotoja që po editon" draggable={false} className="block max-h-[48dvh] max-w-full" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
          {loaded && !failed && <button type="button" aria-label="Zona e editimit" aria-describedby="maro-markup-keyboard"
            className="absolute inset-0 cursor-crosshair touch-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            onKeyDown={onKeyDown}
            onPointerDown={event => {
              if (event.button !== 0 || !event.isPrimary) return;
              previous.current = zone;
              start.current = point(event);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => { if (event.isPrimary) update(event); }}
            onPointerUp={event => {
              if (!event.isPrimary || !start.current) return;
              const next = update(event);
              start.current = null;
              if (!next || next.width < 0.025 || next.height < 0.025) setZone(previous.current);
            }}
            onPointerCancel={() => { if (start.current) { start.current = null; setZone(previous.current); } }}>
            {zone && <span className="pointer-events-none absolute rounded-[50%] border-[3px] border-danger shadow-[0_0_0_1px_white]" style={{
              left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%`,
            }} />}
          </button>}
        </div>
      </div>
      {failed && <p className="mt-3 text-sm text-danger" role="alert">Fotoja nuk u hap. Mbylle dhe provo ta hapësh përsëri.</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setZone(undefined)} disabled={!zone}>Pastroje</Button>
        <Button type="button" disabled={failed || !loaded || !zone || zone.width < 0.025 || zone.height < 0.025} onClick={() => zone && onApply(zone)}>Përdor zonën</Button>
      </div>
    </Modal>
  );
}
