import { useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  createPharmacyRequestStore,
  type KeyValueStorage,
  type PharmacyRequest,
} from "./pharmacy-requests";

/** localStorage, or null where it is unavailable (e.g. blocked site data). */
function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The app's request store. It lives in this browser's localStorage, so the
 * counter tab and a pharmacy tab on the same computer share it.
 */
export const pharmacyRequests = createPharmacyRequestStore(browserStorage());

function subscribe(onChange: () => void): () => void {
  const unsubscribe = pharmacyRequests.subscribe(onChange);
  // Requests confirmed or updated in another tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

/** All confirmed pharmacy requests, newest first, kept up to date. */
export function usePharmacyRequests(): readonly PharmacyRequest[] {
  return useSyncExternalStore(subscribe, pharmacyRequests.list);
}
