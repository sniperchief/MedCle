import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { MedicationRequest } from "../../shared/medication-request.ts";
import { applyCorrection } from "./apply-correction.ts";

const request = (overrides: Partial<MedicationRequest> = {}): MedicationRequest => ({
  medication: null,
  strength: null,
  quantity: null,
  form: null,
  ...overrides,
});
const amoxicillin = request({ medication: "amoxicillin", strength: "500 mg", quantity: "10 tablets" });

describe("applyCorrection", () => {
  test("changes only the field the customer restated", () => {
    assert.deepEqual(applyCorrection(amoxicillin, request({ quantity: "20 tablets" })), {
      request: { ...amoxicillin, quantity: "20 tablets" },
      changed: ["quantity"],
    });
  });

  test("can change several fields at once", () => {
    const result = applyCorrection(amoxicillin, request({ medication: "amoxicillin", strength: "250 mg" }));
    assert.deepEqual(result?.request, { ...amoxicillin, strength: "250 mg" });
    // Restating a value that was already right is not a change.
    assert.deepEqual(result?.changed, ["strength"]);
  });

  test("adds a detail that was missing, as stated", () => {
    const result = applyCorrection(request({ medication: "amoxicillin" }), request({ quantity: "20 tablets", form: "tablet" }));
    assert.deepEqual(result?.request, request({ medication: "amoxicillin", quantity: "20 tablets", form: "tablet" }));
  });

  test("a correction that states nothing changes nothing", () => {
    assert.equal(applyCorrection(amoxicillin, request()), null);
  });

  test("never mutates the current request", () => {
    const current = { ...amoxicillin };
    applyCorrection(current, request({ quantity: "20 tablets" }));
    assert.deepEqual(current, amoxicillin);
  });
});
