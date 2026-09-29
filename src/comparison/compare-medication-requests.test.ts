import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { MedicationRequest } from "../../shared/medication-request.ts";
import { compareMedicationRequests } from "./compare-medication-requests.ts";

const request = (overrides: Partial<MedicationRequest> = {}): MedicationRequest => ({
  medication: "amoxicillin",
  strength: "500 mg",
  quantity: "20 tablets",
  form: "tablet",
  ...overrides,
});
const empty: MedicationRequest = { medication: null, strength: null, quantity: null, form: null };

describe("compareMedicationRequests", () => {
  test("1. exact match → match", () => {
    assert.deepEqual(compareMedicationRequests(request(), request()), {
      status: "match",
      mismatches: [],
      unconfirmed: [],
    });
  });

  for (const [field, customer, pharmacist] of [
    ["medication", "amoxicillin", "amlodipine"],
    ["strength", "500 mg", "50 mg"],
    ["quantity", "20 tablets", "2 tablets"],
    ["form", "tablet", "syrup"],
  ] as const) {
    test(`${field} mismatch → mismatch`, () => {
      const result = compareMedicationRequests(
        request({ [field]: customer }),
        request({ [field]: pharmacist }),
      );
      assert.equal(result.status, "mismatch");
      assert.deepEqual(result.mismatches, [{ field, customer, pharmacist }]);
    });
  }

  test("6. multiple mismatches → all returned, in field order", () => {
    const result = compareMedicationRequests(
      request(),
      request({ medication: "amlodipine", strength: "50 mg", form: "syrup" }),
    );
    assert.equal(result.status, "mismatch");
    assert.deepEqual(
      result.mismatches.map((mismatch) => mismatch.field),
      ["medication", "strength", "form"],
    );
  });

  test("7. customer has strength, pharmacist does not → incomplete, not mismatch", () => {
    const result = compareMedicationRequests(
      request({ strength: "500 mg" }),
      request({ strength: null }),
    );
    assert.equal(result.status, "incomplete");
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.unconfirmed, [
      { field: "strength", customer: "500 mg", pharmacist: null },
    ]);
  });

  test("8. pharmacist has strength, customer does not → incomplete", () => {
    const result = compareMedicationRequests(request({ strength: null }), request());
    assert.equal(result.status, "incomplete");
    assert.deepEqual(result.unconfirmed, [
      { field: "strength", customer: null, pharmacist: "500 mg" },
    ]);
  });

  test("9. both sides missing the same field → no mismatch for it", () => {
    const result = compareMedicationRequests(
      request({ quantity: null, form: null }),
      request({ quantity: null, form: null }),
    );
    assert.deepEqual(result, { status: "match", mismatches: [], unconfirmed: [] });
  });

  test("10. case and spacing differences → match", () => {
    const result = compareMedicationRequests(
      request({ medication: "Amoxicillin", strength: "500 mg", quantity: "20 Tablets" }),
      request({ medication: "amoxicillin", strength: "500mg", quantity: "20  tablets" }),
    );
    assert.equal(result.status, "match");
  });

  test("differently written names are not treated as equivalent", () => {
    const result = compareMedicationRequests(
      request({ medication: "paracetamol" }),
      request({ medication: "acetaminophen" }),
    );
    assert.equal(result.status, "mismatch");
  });

  test("11. empty requests → incomplete", () => {
    assert.deepEqual(compareMedicationRequests(empty, empty), {
      status: "incomplete",
      mismatches: [],
      unconfirmed: [],
    });
    assert.equal(compareMedicationRequests(request(), empty).status, "incomplete");
  });

  test("a mismatch is still reported when other fields are unconfirmed", () => {
    const result = compareMedicationRequests(
      request({ quantity: null }),
      request({ strength: "50 mg" }),
    );
    assert.equal(result.status, "mismatch");
    assert.deepEqual(result.mismatches, [
      { field: "strength", customer: "500 mg", pharmacist: "50 mg" },
    ]);
    assert.deepEqual(result.unconfirmed, [
      { field: "quantity", customer: null, pharmacist: "20 tablets" },
    ]);
  });

  test("12. original values remain unchanged", () => {
    const customer = Object.freeze(request({ medication: "Amoxicillin", strength: "500 MG" }));
    const pharmacist = Object.freeze(request({ medication: "amoxicillin ", strength: "50 mg" }));
    const snapshot = JSON.stringify([customer, pharmacist]);

    const result = compareMedicationRequests(customer, pharmacist);

    assert.equal(JSON.stringify([customer, pharmacist]), snapshot);
    assert.deepEqual(result.mismatches, [
      { field: "strength", customer: "500 MG", pharmacist: "50 mg" },
    ]);
  });
});
