"use client";

import * as React from "react";
import SpecularButton from "@/components/ui/SpecularButton";
import { MaroIcon } from "@/components/app/OptionIcon";

/** Defer provider admission: cancelling the two-second fuse cannot spend credits. */
export const GenerateButton = React.forwardRef<HTMLButtonElement, {
  onCommit: () => void;
  disabled?: boolean;
  loading?: boolean;
  cost?: number;
  cancelKey: string;
}>(({ onCommit, disabled, loading, cost, cancelKey }, ref) => {
  const [armed, setArmed] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArmed(false);
  }, []);
  React.useEffect(() => {
    cancel();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cancelKey, disabled, cancel]);
  React.useEffect(() => {
    if (!armed) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [armed, cancel]);
  const press = () => {
    if (timer.current) { cancel(); return; }
    if (disabled || loading) return;
    setArmed(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setArmed(false);
      onCommit();
    }, 2000);
  };
  return <SpecularButton
    ref={ref}
    size="lg"
    radius={18}
    tint="#ffffff"
    tintOpacity={0.04}
    textColor="#f5f5f5"
    lineColor="#ffffff"
    baseColor="#525252"
    intensity={1}
    idleIntensity={0.35}
    shineSize={10}
    shineFade={34}
    thickness={1.2}
    glow={1}
    followMouse
    proximity={250}
    onClick={press}
    disabled={loading || (!armed && disabled)}
    aria-busy={loading || undefined}
    aria-label={armed ? "Anulo gjenerimin" : "Gjenero"}
    className="maro-generate-fuse min-w-[8rem] shrink-0"
  >
    <span className="inline-flex items-center gap-2" aria-live="polite">
      {armed ? "Anulo · 2s" : <><span>maro{cost !== undefined && " për"}</span>{cost !== undefined && <><MaroIcon name="coins" className="h-4 w-4" /><span>{cost}</span></>}</>}
    </span>
    {armed && <span aria-hidden className="maro-generate-fuse__line" />}
  </SpecularButton>;
});
GenerateButton.displayName = "GenerateButton";
