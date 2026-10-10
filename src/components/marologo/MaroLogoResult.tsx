"use client";

import { StableImage } from "@/components/app/StableImage";
import { GenerationLoader } from "@/components/app/GenerationLoader";

import * as React from "react";
import { Download, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CreationLightbox } from "@/components/app/cards";
import type { ImageCreation } from "@/lib/types";

export function MaroLogoResult({
  creation,
  onRestart,
  elapsed,
}: {
  creation: ImageCreation;
  onRestart: () => void;
  elapsed?: number;
}) {
  const [lightbox, setLightbox] = React.useState(false);
  const router = useRouter();
  const url = creation.urls[0];
  const storageRef = creation.storageRefs?.[0];

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${creation.prompt.slice(0, 40).replace(/\s+/g, "-") || "maro-logo"}.png`;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };

  const useInMaroImazh = () => {
    if (!url || !storageRef?.startsWith("storage:generations/")) return;
    sessionStorage.setItem(
      "maro:image-reference",
      JSON.stringify({ storageRef, previewUrl: url })
    );
    router.push("/imazh");
  };

  return (
    <div className="marologo-shell pb-12">
      <h1 className="marologo-step-title mb-8">Logo e gatshme</h1>
      <GenerationLoader status="done" elapsed={elapsed} className="mx-auto max-w-md" />
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="marologo-card mx-auto block w-full max-w-md overflow-hidden p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <StableImage src={url} module="logo" refreshKey={storageRef ?? creation.id} alt="Logo e gjeneruar" fallbackClassName="aspect-square" className="mx-auto max-h-[360px] w-full object-contain" />
        </button>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={download}>
          Shkarko
        </Button>
        {storageRef?.startsWith("storage:generations/") && (
          <Button type="button" variant="secondary" icon={<ImagePlus className="h-4 w-4" />} onClick={useInMaroImazh}>
            Përdor në maroImazh
          </Button>
        )}
        <Button type="button" onClick={onRestart}>
          Maro logo tjetër
        </Button>
      </div>
      {lightbox && creation && (
        <CreationLightbox creation={creation} open={lightbox} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
