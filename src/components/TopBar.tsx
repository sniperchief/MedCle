import { useEffect, useState, type ReactNode } from "react";
import { Link } from "../router";
import { CloseIcon, MenuIcon } from "./icons";

/** The MEDCLE logo (mark and wordmark), served from public/logo.png. */
export function Logo({ height = 32 }: { height?: number }) {
  // The PNG is 378×96; width follows the height.
  return (
    <img
      className="logo__image"
      src="/logo.png"
      alt="MEDCLE"
      height={height}
      width={Math.round(height * 3.9375)}
    />
  );
}

export interface NavLink {
  href: string;
  label: string;
}

interface TopBarProps {
  /** Section links, centred on wide screens and in a Menu dropdown on small ones. */
  links?: NavLink[];
  /** Buttons or links on the right, e.g. Launch MEDCLE. */
  actions?: ReactNode;
}

/** Sticky site bar: logo (home link), centred menu, and page actions. */
export function TopBar({ links = [], actions }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const linkItems = links.map((link) => (
    <a key={link.href} href={link.href} onClick={closeMenu}>
      {link.label}
    </a>
  ));

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/" className="logo" aria-label="MEDCLE home">
          <Logo />
        </Link>

        {links.length > 0 && (
          <nav className="topbar__nav" aria-label="Main">
            {linkItems}
          </nav>
        )}

        <div className="topbar__actions">
          {actions}
          {links.length > 0 && (
            <button
              type="button"
              className="topbar__menu-button"
              aria-expanded={menuOpen}
              aria-controls="topbar-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav id="topbar-menu" className="topbar__menu" aria-label="Main">
          {linkItems}
          {actions && (
            <div className="topbar__menu-actions" onClick={closeMenu}>
              {actions}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
