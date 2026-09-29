import type { ReactNode } from "react";
import { Link } from "../router";
import { LogoMark } from "./icons";

/** Sticky site bar: the MEDCLE logo (home link) and page-specific actions. */
export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="logo" aria-label="MEDCLE home">
          <LogoMark />
          <span className="logo__word">medcle</span>
        </Link>
        {children}
      </div>
    </header>
  );
}
