"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { clearLabels, type BrainClearSection } from "@/lib/brain-studio/operations";
import styles from "./BrainStudio.module.css";

export function BrainClearDialog({ section, onClose, onConfirm }: { section: BrainClearSection | null; onClose: () => void; onConfirm: (section: BrainClearSection) => Promise<void> }) {
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  React.useEffect(() => { setAcknowledged(false); setError(""); }, [section]);
  const submit = async () => { if (!section || !acknowledged || busy) return; setBusy(true); setError(""); try { await onConfirm(section); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Fshirja nuk përfundoi."); } finally { setBusy(false); } };
  return <Modal open={Boolean(section)} onClose={() => { if (!busy) onClose(); }} aria-label={section === "all" ? "Nisja prej fillimit" : "Pastro seksionin"} closeOnBackdrop={!busy} hideClose={busy}>
    <ModalHeader icon={<Trash2 size={20}/>} title={section === "all" ? "Nisja prej fillimit?" : `Pastro ${section ? clearLabels[section] : "seksionin"}?`} description={section === "all" ? "Fshihen identiteti, audienca, qëllimet, tregu, komunikimi, të gjitha memorjet, dosjet dhe burimet e këtij maroBrain, bashkë me historinë e tyre." : `Fshihet vetëm ${section ? clearLabels[section] : "ky seksion"}, bashkë me historinë përkatëse. Pjesët e tjera të maroBrain ruhen.`}/>
    <div className={styles.confirmBody}><p>Ky veprim nuk kthehet mbrapa. Workspace-i dhe gjenerimet e tua mbeten.</p><label className={styles.confirmCheck}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)}/><span>E kuptoj që këto të dhëna fshihen përgjithmonë.</span></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>
    <ModalFooter><Button variant="ghost" disabled={busy} onClick={onClose}>Anulo</Button><Button variant="danger" loading={busy} disabled={!acknowledged || busy} onClick={() => void submit()}>{section === "all" ? "Fshi gjithçka dhe nis nga fillimi" : "Fshi vetëm këtë seksion"}</Button></ModalFooter>
  </Modal>;
}
