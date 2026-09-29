import assert from "node:assert/strict";
import { test } from "node:test";
import { MEDICATION_KEYTERMS } from "./medication-keyterms.ts";

// AssemblyAI rejects sessions with more than 100 key terms and ignores terms
// longer than 50 characters.
test("stays within AssemblyAI's key-term limits", () => {
  assert.ok(MEDICATION_KEYTERMS.length > 0);
  assert.ok(MEDICATION_KEYTERMS.length <= 100, `${MEDICATION_KEYTERMS.length} terms`);
  for (const term of MEDICATION_KEYTERMS) {
    assert.ok(term.trim() === term && term.length > 0, `blank or padded term: "${term}"`);
    assert.ok(term.length <= 50, `too long: "${term}"`);
  }
});

test("has no duplicates (ignoring case)", () => {
  const lower = MEDICATION_KEYTERMS.map((term) => term.toLowerCase());
  assert.equal(new Set(lower).size, lower.length);
});
