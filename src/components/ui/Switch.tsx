"use client";

export function SwitchTrack({ checked, size = "sm" }: { checked: boolean; size?: "sm" | "md" }) {
  return <span aria-hidden="true" className="maro-switch-track" data-checked={checked} data-size={size}><span className="maro-switch-knob" /></span>;
}

export function Switch({ checked, onChange, size = "md", disabled, "aria-label": ariaLabel, label }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  "aria-label"?: string;
  label?: string;
}) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel ?? label}
    disabled={disabled} onClick={() => onChange(!checked)}
    className="maro-switch inline-flex shrink-0 items-center gap-2.5 rounded-full disabled:cursor-not-allowed disabled:opacity-45">
    <SwitchTrack checked={checked} size={size} />
    {label && <span className="text-sm font-medium text-ink">{label}</span>}
  </button>;
}
