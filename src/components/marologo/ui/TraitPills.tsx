"use client";

import { BRAND_TRAITS, MAX_TRAITS } from "@/lib/marologo/constants";

export function TraitPills({
  value,
  onChange,
  onMaxReached,
}: {
  value: string[];
  onChange: (traits: string[]) => void;
  onMaxReached?: () => void;
}) {
  const toggle = (trait: string) => {
    if (value.includes(trait)) {
      onChange(value.filter((t) => t !== trait));
      return;
    }
    if (value.length >= MAX_TRAITS) {
      onMaxReached?.();
      return;
    }
    onChange([...value, trait]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {BRAND_TRAITS.map((trait) => {
        const active = value.includes(trait);
        return (
          <button
            key={trait}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(trait)}
            className="maro-chip-select min-h-[44px] px-4 py-2.5"
            data-selected={active || undefined}
          >
            {trait}
          </button>
        );
      })}
    </div>
  );
}
