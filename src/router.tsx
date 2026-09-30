// A minimal client-side router for MEDCLE's pages: "/", "/app" and "/pharmacy".

import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

/** Where the counter tool lives; every other path shows the landing page. */
export const APP_PATH = "/app";
/** The pharmacist's queue of confirmed requests. */
export const PHARMACY_PATH = "/pharmacy";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/** An in-app link: a real anchor that navigates without a full page load. */
export function Link({ to, onClick, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const opensElsewhere = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || event.button !== 0 || opensElsewhere) return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handleClick} {...props} />;
}
