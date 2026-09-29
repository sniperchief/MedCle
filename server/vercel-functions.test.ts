// The Vercel functions in api/ and the shared token route, without network calls.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { POST as extractMedication } from "../api/extract-medication.ts";
import { POST as streamingToken } from "../api/streaming-token.ts";
import { streamingTokenResult } from "./streaming-token.ts";

const KEYS = ["ASSEMBLYAI_API_KEY", "ANTHROPIC_API_KEY"] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

// Run with no API keys so nothing can reach AssemblyAI or Anthropic.
before(() => KEYS.forEach((key) => delete process.env[key]));
after(() => {
  for (const key of KEYS) if (saved[key] !== undefined) process.env[key] = saved[key];
});

const post = (body: string) =>
  new Request("https://medcle.test/api/extract-medication", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

describe("streamingTokenResult", () => {
  test("returns the token, never cached", async () => {
    const result = await streamingTokenResult(async () => "temp-token");
    assert.deepEqual(result, {
      status: 200,
      body: { token: "temp-token" },
      headers: { "Cache-Control": "no-store" },
    });
  });

  test("hides token failures behind a generic 502", async () => {
    const result = await streamingTokenResult(async () => {
      throw new Error("Invalid API key");
    });
    assert.equal(result.status, 502);
    assert.deepEqual(result.body, { error: "Could not create a transcription token." });
  });
});

describe("api/streaming-token (Vercel)", () => {
  test("without the AssemblyAI key: generic 502, no secrets, not cached", async () => {
    const response = await streamingToken();
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Could not create a transcription token." });
  });
});

describe("api/extract-medication (Vercel)", () => {
  test("rejects invalid JSON with 400", async () => {
    const response = await extractMedication(post("{not json"));
    assert.equal(response.status, 400);
  });

  test("rejects a missing or blank transcript with 400", async () => {
    assert.equal((await extractMedication(post("{}"))).status, 400);
    assert.equal((await extractMedication(post('{"transcript":"  "}'))).status, 400);
  });

  test("without the Anthropic key: generic 502 for a valid transcript", async () => {
    const response = await extractMedication(post('{"transcript":"I need amoxicillin."}'));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: "Could not extract the medication request." });
  });
});
