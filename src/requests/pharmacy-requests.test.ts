import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  STORAGE_KEY,
  createPharmacyRequestStore,
  requestDetails,
  type KeyValueStorage,
  type PharmacyRequest,
} from "./pharmacy-requests.ts";

const pharmacyRequest = (overrides: Partial<PharmacyRequest> = {}): PharmacyRequest => ({
  id: "request-1",
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: "10 tablets",
  form: null,
  status: "new",
  createdAt: "2026-09-30T10:42:00.000Z",
  confirmedAt: "2026-09-30T10:42:00.000Z",
  updatedAt: "2026-09-30T10:42:00.000Z",
  confirmedBy: "voice",
  confirmationReply: "Yes.",
  originalTranscript: "I need amoxicillin 500 milligrams, 10 tablets.",
  corrections: [],
  ...overrides,
});

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("pharmacy request store", () => {
  test("adds requests newest first and saves them", () => {
    const storage = memoryStorage();
    const store = createPharmacyRequestStore(storage);
    assert.deepEqual(store.list(), []);

    assert.equal(store.add(pharmacyRequest({ id: "a" })), true);
    assert.equal(store.add(pharmacyRequest({ id: "b", medication: "paracetamol" })), true);

    assert.deepEqual(
      store.list().map((request) => request.id),
      ["b", "a"],
    );
    assert.equal(createPharmacyRequestStore(storage).list().length, 2);
  });

  test("never adds the same request twice", () => {
    const store = createPharmacyRequestStore(memoryStorage());
    store.add(pharmacyRequest());
    assert.equal(store.add(pharmacyRequest({ quantity: "20 tablets" })), false);
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0]?.quantity, "10 tablets");
  });

  test("keeps the original transcript and corrections exactly", () => {
    const store = createPharmacyRequestStore(memoryStorage());
    const request = pharmacyRequest({ corrections: ["No, I said 20 tablets."] });
    store.add(request);
    assert.deepEqual(store.list()[0], request);
  });

  test("changes status and records when", () => {
    const store = createPharmacyRequestStore(memoryStorage());
    store.add(pharmacyRequest());
    store.setStatus("request-1", "reviewing", new Date("2026-09-30T10:50:00.000Z"));
    assert.equal(store.list()[0]?.status, "reviewing");
    assert.equal(store.list()[0]?.updatedAt, "2026-09-30T10:50:00.000Z");
    assert.equal(store.list()[0]?.confirmedAt, "2026-09-30T10:42:00.000Z");

    store.setStatus("request-1", "completed");
    assert.equal(store.list()[0]?.status, "completed");
    store.setStatus("unknown", "completed"); // ignored
    assert.equal(store.list().length, 1);
  });

  test("notifies subscribers of changes, and returns the same list until one", () => {
    const store = createPharmacyRequestStore(memoryStorage());
    let changes = 0;
    const unsubscribe = store.subscribe(() => changes++);
    const before = store.list();
    assert.equal(store.list(), before);

    store.add(pharmacyRequest());
    store.setStatus("request-1", "reviewing");
    store.setStatus("request-1", "reviewing"); // no change
    assert.equal(changes, 2);
    assert.notEqual(store.list(), before);

    unsubscribe();
    store.setStatus("request-1", "completed");
    assert.equal(changes, 2);
  });

  test("sees requests written by another tab", () => {
    const storage = memoryStorage();
    const counter = createPharmacyRequestStore(storage);
    const pharmacy = createPharmacyRequestStore(storage);
    assert.equal(pharmacy.list().length, 0);
    counter.add(pharmacyRequest());
    assert.equal(pharmacy.list().length, 1);
  });

  test("drops malformed stored data instead of failing", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify([pharmacyRequest(), { id: "broken" }, null]));
    assert.deepEqual(
      createPharmacyRequestStore(storage).list().map((request) => request.id),
      ["request-1"],
    );
    storage.setItem(STORAGE_KEY, "not json");
    assert.deepEqual(createPharmacyRequestStore(storage).list(), []);
  });

  test("works in memory without storage, or when storage rejects writes", () => {
    const store = createPharmacyRequestStore(null);
    store.add(pharmacyRequest());
    assert.equal(store.list().length, 1);

    const full: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const original = console.warn;
    console.warn = () => {};
    try {
      const fallback = createPharmacyRequestStore(full);
      fallback.add(pharmacyRequest());
      assert.equal(fallback.list().length, 1);
    } finally {
      console.warn = original;
    }
  });
});

describe("requestDetails", () => {
  test("joins what was stated", () => {
    assert.equal(requestDetails(pharmacyRequest()), "500 mg · 10 tablets");
    assert.equal(requestDetails(pharmacyRequest({ quantity: null, form: "capsule" })), "500 mg · capsule");
  });

  test("leaves out a form the quantity already names", () => {
    assert.equal(requestDetails(pharmacyRequest({ form: "tablet" })), "500 mg · 10 tablets");
  });

  test("is empty when nothing but the name was stated", () => {
    assert.equal(requestDetails(pharmacyRequest({ strength: null, quantity: null })), "");
  });
});
