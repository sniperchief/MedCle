import type { MedicationRequest } from "../../shared/medication-request";

export type RequestStatus = "new" | "reviewing" | "completed";

export const REQUEST_STATUSES: readonly RequestStatus[] = ["new", "reviewing", "completed"];

/**
 * A medication request the customer confirmed, for the pharmacist to review.
 * The medication fields hold exactly what the customer confirmed (null when
 * not stated); the transcript is kept so the pharmacist can check them
 * against what the customer actually said.
 */
export interface PharmacyRequest extends MedicationRequest {
  id: string;
  /** The pharmacist's progress with the request. */
  status: RequestStatus;
  createdAt: string;
  /** When the customer confirmed it (ISO 8601). A request only exists once confirmed. */
  confirmedAt: string;
  updatedAt: string;
  /** How the customer confirmed: by answering the readback, or with the button. */
  confirmedBy: "voice" | "button";
  /** The customer's spoken answer, when confirmed by voice. */
  confirmationReply: string | null;
  /** What the customer first said. */
  originalTranscript: string;
  /** What the customer said to correct the readback, in order. */
  corrections: string[];
}

/**
 * Where confirmed requests are kept. The UI only uses this interface, so the
 * browser storage behind it can be swapped for a server later.
 */
export interface PharmacyRequestStore {
  /** All requests, newest first. The same array until something changes. */
  list(): readonly PharmacyRequest[];
  /** Adds a request unless one with its id already exists; returns whether it was added. */
  add(request: PharmacyRequest): boolean;
  setStatus(id: string, status: RequestStatus, now?: Date): void;
  /** Calls `listener` after every change made through this store. */
  subscribe(listener: () => void): () => void;
}

/** The part of the Web Storage API the store needs. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const STORAGE_KEY = "medcle.pharmacy-requests.v1";

/**
 * A request store kept as JSON under one key of `storage` (e.g. localStorage,
 * which other tabs can read too), or in memory when there is no storage or it
 * stops accepting writes. It re-reads the stored value on every `list()`, so
 * changes from another tab show up on the next read.
 */
export function createPharmacyRequestStore(
  storage: KeyValueStorage | null,
  key = STORAGE_KEY,
): PharmacyRequestStore {
  const listeners = new Set<() => void>();
  let memory: string | null = null;
  let cached: { raw: string | null; requests: readonly PharmacyRequest[] } | null = null;

  const read = (): string | null => {
    if (!storage) return memory;
    try {
      return storage.getItem(key);
    } catch {
      return memory;
    }
  };

  const write = (requests: readonly PharmacyRequest[]) => {
    const raw = JSON.stringify(requests);
    memory = raw;
    try {
      storage?.setItem(key, raw);
    } catch (error) {
      console.warn("[MEDCLE] Couldn't save pharmacy requests; keeping them in memory.", error);
      storage = null;
    }
    listeners.forEach((listener) => listener());
  };

  const list = (): readonly PharmacyRequest[] => {
    const raw = read();
    if (cached?.raw !== raw) cached = { raw, requests: parseRequests(raw) };
    return cached.requests;
  };

  return {
    list,
    add(request) {
      const requests = list();
      if (requests.some((existing) => existing.id === request.id)) return false;
      write([request, ...requests]);
      return true;
    },
    setStatus(id, status, now = new Date()) {
      const requests = list();
      const target = requests.find((request) => request.id === id);
      if (!target || target.status === status) return;
      write(
        requests.map((request) =>
          request === target ? { ...request, status, updatedAt: now.toISOString() } : request,
        ),
      );
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Parses stored requests, dropping anything malformed rather than failing. */
function parseRequests(raw: string | null): readonly PharmacyRequest[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isPharmacyRequest) : [];
  } catch {
    return [];
  }
}

function isPharmacyRequest(value: unknown): value is PharmacyRequest {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const strings = ["id", "createdAt", "confirmedAt", "updatedAt", "originalTranscript"];
  const optionalStrings = ["medication", "strength", "quantity", "form", "confirmationReply"];
  return (
    strings.every((field) => typeof record[field] === "string") &&
    optionalStrings.every((field) => record[field] === null || typeof record[field] === "string") &&
    REQUEST_STATUSES.includes(record.status as RequestStatus) &&
    (record.confirmedBy === "voice" || record.confirmedBy === "button") &&
    Array.isArray(record.corrections) &&
    record.corrections.every((entry) => typeof entry === "string")
  );
}

/**
 * The strength, quantity and form on one line ("500 mg · 10 tablets"),
 * leaving out a form the quantity already names. Empty when none was stated.
 */
export function requestDetails(request: MedicationRequest): string {
  const { strength, quantity, form } = request;
  const formInQuantity = form && quantity?.toLowerCase().includes(form.toLowerCase());
  return [strength, quantity, formInQuantity ? null : form].filter(Boolean).join(" · ");
}
