"use client";

import * as React from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { Coins, Mail } from "lucide-react";

// Test-mode credits: real payments are disabled. Only the admin grants credits,
// so this modal explains how to get more.
export function BuyCreditsModal({
  open,
  onClose,
  needed,
}: {
  open: boolean;
  onClose: () => void;
  needed?: number;
}) {
  const { credits, user } = useMaro();
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader
        icon={<Coins className="h-5 w-5" />}
        title="Kredite të pamjaftueshme"
        description="Pagesat janë në test mode. Kreditet i cakton administratori."
      />
      <div className="px-6 pb-2">
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="text-ink-2">Kreditet e tua</span>
            <span className="font-bold text-ink">{credits}</span>
          </div>
          {typeof needed === "number" && (
            <div className="mt-2 flex items-center justify-between text-[13.5px]">
              <span className="text-ink-2">Nevojiten</span>
              <span className="font-bold text-brand">{needed}</span>
            </div>
          )}
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">
          Për të marrë kredite gjatë testimit, kontakto administratorin me email-in tënd
          {user?.email ? (
            <>
              {" "}
              (<span className="font-medium text-ink">{user.email}</span>)
            </>
          ) : null}
          . Administratori mund të të caktojë kredite menjëherë nga paneli.
        </p>
        <a
          href="mailto:erzen@nice.al?subject=Maro%20Kredite"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <Mail className="h-4 w-4 text-brand" /> Kontakto administratorin
        </a>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Mbylle
        </Button>
      </ModalFooter>
    </Modal>
  );
}
