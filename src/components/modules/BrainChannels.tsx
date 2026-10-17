"use client";
import * as React from "react";
import { Instagram, Facebook, Youtube, Linkedin, Music2, AtSign, MessageCircle, Send, Globe, Pin, Camera, Hash, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { BrainChannel } from "@/lib/workspaces/brainTypes";
import styles from "./BrainStudio.module.css";

export const BRAIN_CHANNELS = ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "X", "Threads", "Pinterest", "Snapchat", "WhatsApp", "Telegram", "Discord", "Reddit", "Twitch", "Behance", "Dribbble", "Google Business", "Tjetër"];
const icons: Record<string, typeof Instagram> = { Instagram, Facebook, LinkedIn: Linkedin, YouTube: Youtube, TikTok: Music2, X: AtSign, Threads: AtSign, Pinterest: Pin, Snapchat: Camera, WhatsApp: MessageCircle, Telegram: Send, Discord: MessageCircle, Reddit: Hash, Twitch: Camera, Behance: Globe, Dribbble: Globe };
export function BrainChannelIcon({ platform }: { platform: string }) { const Icon = icons[platform] || Globe; return <Icon size={20} aria-hidden="true"/>; }
export function BrainChannels({ channels, onChange }: { channels: BrainChannel[]; onChange: (items: BrainChannel[]) => void }) {
  const [adding, setAdding] = React.useState(false);
  const patch = (id: string, value: Partial<BrainChannel>) => onChange(channels.map(item => item.id === id ? { ...item, ...value } : item));
  return <section className={styles.identityBlock} aria-label="Kanalet sociale"><div className={styles.sectionHeading}><div><h3>Kanalet sociale</h3><p>Ku të gjejnë njerëzit? Shto linkun ose @emrin e profilit.</p></div><Button variant="secondary" icon={<Plus size={16}/>} onClick={() => setAdding(value => !value)} aria-expanded={adding}>Shto kanal</Button></div>
    {adding && <div className={styles.channelPicker} aria-label="Zgjidh rrjetin social">{BRAIN_CHANNELS.map(platform => <button type="button" key={platform} onClick={() => { onChange([...channels, { id: `ch_${crypto.randomUUID()}`, platform, handle: "" }]); setAdding(false); }}><BrainChannelIcon platform={platform}/><span>{platform}</span></button>)}</div>}
    {!channels.length && !adding && <p className={styles.hint}>Ende pa kanale. Instagram, TikTok, LinkedIn dhe shumë të tjera.</p>}
    <div className={styles.channelList}>{channels.map(channel => <div className={styles.channelRow} key={channel.id}><span className={styles.channelIcon}><BrainChannelIcon platform={channel.platform}/></span><label className={styles.field}><span className="sr-only">Rrjeti social</span><select className="maro-input" aria-label={`Rrjeti i kanalit ${channel.platform}`} value={channel.platform} onChange={event => patch(channel.id, { platform: event.target.value })}>{[...new Set([...BRAIN_CHANNELS, channel.platform])].map(item => <option key={item}>{item}</option>)}</select></label><label className={styles.field}><span className="sr-only">Profili në {channel.platform}</span><input className="maro-input" placeholder="https://… ose @profili" value={channel.handle} maxLength={2048} onChange={event => patch(channel.id, { handle: event.target.value })}/></label><Button variant="ghost" size="icon" aria-label={`Hiq kanalin ${channel.platform}`} onClick={() => onChange(channels.filter(item => item.id !== channel.id))}><Trash2 size={16}/></Button></div>)}</div>
  </section>;
}
