"use client";

/**
 * Archived maroWeb Hub browser/mini-site study.
 * Preserved for possible reuse — not mounted in the live Hub.
 */
import { ArrowUpRight } from "lucide-react";
import { IdentityMark } from "./IdentityMark";
import s from "../HubVision.module.css";

export function WebArtStudy() {
  return (
    <div className={s.webStudy}>
      <div className={s.browserBar}>
        <span />
        <span />
        <span />
        <small>një ide, një adresë.</small>
      </div>
      <div className={s.miniWebsite}>
        <span>forma®</span>
        <div>
          <strong>
            Less,
            <br />
            but better.
          </strong>
          <IdentityMark />
        </div>
        <i>
          Discover the collection <ArrowUpRight size={11} />
        </i>
      </div>
    </div>
  );
}
