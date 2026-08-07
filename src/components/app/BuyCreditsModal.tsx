"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { Coins } from "lucide-react";

export function BuyCreditsModal({
  open,
  onClose,
  needed,
}: {
  open: boolean;
  onClose: () => void;
  needed?: number;
}) {
  const router = useRouter();
  const { credits } = useMaro();
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader
        icon={<Coins className="h-5 w-5" />}
        title="Kredite të pamjaftueshme"
        description="Zgjidh një plan ose rimbush kredite për të vazhduar."
      />
      <div className="px-6 pb-2">
        <div className="rounded-xl bg-surface-2 p-4">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-ink-2">Kreditet e tua</span>
            <span className="font-bold text-ink">{credits.toLocaleString("de-DE")}</span>
          </div>
          {typeof needed === "number" && (
            <div className="mt-2 flex items-center justify-between text-[13.5px]">
              <span className="text-ink-2">Nevojiten</span>
              <span className="font-bold text-brand">{needed.toLocaleString("de-DE")}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/pricing");
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
        >
          <Coins className="h-4 w-4" /> Shiko planet & kredite
        </button>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Mbylle
        </Button>
      </ModalFooter>
    </Modal>
  );
}
