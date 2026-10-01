"use client";

import * as React from "react";
import { formatCredits } from "@/lib/credits/format";
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
        <div className="rounded-maro12 bg-surface-2 p-4">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-ink-2">Kreditet e tua</span>
            <span className="font-bold text-ink">{formatCredits(credits)}</span>
          </div>
          {typeof needed === "number" && (
            <div className="mt-2 flex items-center justify-between text-[13.5px]">
              <span className="text-ink-2">Nevojiten</span>
              <span className="font-bold text-brand">{formatCredits(needed)}</span>
            </div>
          )}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            onClose();
            router.push("/pricing");
          }}
        >
          <Coins className="h-4 w-4" /> Shiko planet & kredite
        </Button>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Mbylle
        </Button>
      </ModalFooter>
    </Modal>
  );
}
