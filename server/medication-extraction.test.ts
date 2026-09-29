import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import express from "express";
import type { MedicationRequest } from "../shared/medication-request.ts";
import {
  ExtractionError,
  MAX_TRANSCRIPT_LENGTH,
  createMedicationExtractionHandler,
  toMedicationRequest,
} from "./medication-extraction.ts";

describe("toMedicationRequest", () => {
  test("keeps stated values exactly and null for absent ones", () => {
    assert.deepEqual(
      toMedicationRequest({ medication: "ancetamophin", strength: "20 g", quantity: null, form: null }),
      { medication: "ancetamophin", strength: "20 g", quantity: null, form: null },
    );
  });

  test("trims values and turns blank strings into null", () => {
    assert.deepEqual(
      toMedicationRequest({ medication: " Panadol ", strength: "", quantity: "  ", form: null }),
      { medication: "Panadol", strength: null, quantity: null, form: null },
    );
  });

  test("rejects replies that are not objects", () => {
    assert.throws(() => toMedicationRequest(null), ExtractionError);
    assert.throws(() => toMedicationRequest("amoxicillin"), ExtractionError);
  });

  test("rejects missing or non-string fields", () => {
    assert.throws(
      () => toMedicationRequest({ medication: "amoxicillin", strength: 500, quantity: null, form: null }),
      ExtractionError,
    );
    assert.throws(() => toMedicationRequest({ medication: "amoxicillin" }), ExtractionError);
  });
});

describe("POST /api/extract-medication", () => {
  const extracted: MedicationRequest = {
    medication: "amoxicillin",
    strength: "500 mg",
    quantity: null,
    form: null,
  };
  const received: string[] = [];
  let baseUrl = "";
  let close = () => {};

  before(async () => {
    const app = express();
    app.post(
      "/api/extract-medication",
      express.json(),
      createMedicationExtractionHandler(async (transcript) => {
        received.push(transcript);
        if (transcript === "fail") throw new ExtractionError("model unavailable");
        return extracted;
      }),
    );
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}/api/extract-medication`;
    close = () => server.close();
  });
  after(() => close());

  const post = (body: unknown) =>
    fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  test("returns the extracted request for a trimmed transcript", async () => {
    const response = await post({ transcript: "  I need amoxicillin 500 milligrams.  " });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), extracted);
    assert.equal(received.at(-1), "I need amoxicillin 500 milligrams.");
  });

  for (const [name, body] of [
    ["a missing transcript", {}],
    ["a non-string transcript", { transcript: 42 }],
    ["a blank transcript", { transcript: "   " }],
    ["a too-long transcript", { transcript: "a".repeat(MAX_TRANSCRIPT_LENGTH + 1) }],
  ] as const) {
    test(`rejects ${name} with 400 without extracting`, async () => {
      const calls = received.length;
      const response = await post(body);
      assert.equal(response.status, 400);
      assert.equal(received.length, calls);
    });
  }

  test("hides extraction failures behind a generic 502", async () => {
    const response = await post({ transcript: "fail" });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Could not extract the medication request." });
  });
});
