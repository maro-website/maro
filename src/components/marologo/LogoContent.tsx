"use client";
import * as React from "react";
import { DEFAULT_LOGO_CONTENT, orderedLogoKeys, type LogoContent, type LogoFieldKey } from "@/lib/marologo/content";
export const LogoContentContext = React.createContext<LogoContent>(DEFAULT_LOGO_CONTENT);
export const useLogoContent = () => React.useContext(LogoContentContext);
export function LogoFields({ fields, className }: { fields: Partial<Record<LogoFieldKey, React.ReactNode>>; className?: string }) {
  const content = useLogoContent();
  return <div className={className ?? "space-y-[30px]"}>{orderedLogoKeys(content, Object.keys(fields) as LogoFieldKey[]).map((key) => <React.Fragment key={key}>{fields[key]}{content[key].help && <p className="text-[12px] text-ink-3">{content[key].help}</p>}</React.Fragment>)}</div>;
}
