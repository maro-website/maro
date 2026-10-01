"use client";
import { useLogoContent } from "../LogoContent";
import { logoOptions } from "@/lib/marologo/content";

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
  const content = useLogoContent();
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
    <div className="flex flex-wrap gap-[10px]">
      {logoOptions(content, "direction.traits").map((option) => {
        const trait = option.value;
        const active = value.includes(trait);
        return (
          <button
            key={trait}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(trait)}
            className="maro-chip-select min-h-[52px] px-[20px] py-[10px]"
            data-selected={active || undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
