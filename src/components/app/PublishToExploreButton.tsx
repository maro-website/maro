"use client";

import * as React from "react";
import { shareToExplore } from "@/lib/services/exploreFeedService";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { Globe, Loader2 } from "lucide-react";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { StableImage } from "@/components/app/StableImage";

export function PublishToExploreButton({
  toolId,
  prompt,
  url,
  remixOf,
  selections,
  storedUrl,
}: {
  toolId: string;
  prompt: string;
  url: string;
  remixOf?: string;
  selections?: Record<string, string>;
  storedUrl?: string;
}) {
  const { user } = useMaro();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  React.useEffect(() => { setPublished(false); setOpen(false); setShowPrompt(false); setShowSettings(false); }, [storedUrl, url]);

  const publish = async () => {
    if (!user) {
      toast("Hyr për të publikuar në Explore.");
      return;
    }
    setLoading(true);
    try {
      const res = await shareToExplore({ toolId, prompt, url: storedUrl ?? url, remixOf, selections, showPrompt, showSettings });
      setPublished(true);
      setOpen(false);
      toast(res.slug ? `Publikuar! /c/${res.slug}` : "Publikuar në Explore!");
    } catch {
      toast("S'u publikua dot. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <><button
      type="button"
      onClick={() => { if (!user) { toast("Hyr për të publikuar në Explore."); return; } setOpen(true); }}
      disabled={loading || published}
      className="inline-flex h-9 items-center gap-1.5 rounded-maro12 bg-surface-2 px-3 text-[12px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Globe className="h-3.5 w-3.5" />
      )}
      {published ? "Publikuar" : "Publiko në Explore"}
    </button>
    <Modal open={open} onClose={() => { if (!loading) setOpen(false); }} size="md">
      <ModalHeader title="Publiko në Explore" description="Zgjedh çka dëshiron të shohë komuniteti." />
      <StableImage src={url} alt="Gjenerimi që do të publikohet" className="max-h-64 w-full rounded-maro16 bg-surface-2 object-contain" />
      <div className="my-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-ink">Shfaq promptin</p><p className="mt-1 text-xs text-ink-3">Kur është fikur, publikohet vetëm imazhi për inspirim.</p></div><Switch checked={showPrompt} onChange={setShowPrompt} aria-label="Shfaq promptin publikisht" /></div>
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-ink">Shfaq atributet / settings</p><p className="mt-1 text-xs text-ink-3">Modeli, formati dhe zgjedhjet e gjenerimit.</p></div><Switch checked={showSettings} onChange={setShowSettings} aria-label="Shfaq settings publikisht" /></div>
      </div>
      <Button loading={loading} onClick={() => void publish()} className="w-full">Publiko</Button>
    </Modal></>
  );
}
