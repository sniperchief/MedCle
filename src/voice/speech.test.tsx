// Runs under Vitest to stub the browser's speech synthesis.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { speak, stopSpeaking } from "./speech";

class FakeUtterance {
  text: string;
  lang = "";
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
const utterances: FakeUtterance[] = [];
const synth = {
  speak: vi.fn((utterance: FakeUtterance) => utterances.push(utterance)),
  // Like browsers, cancelling reports an interruption to the utterance.
  cancel: vi.fn(() => utterances.at(-1)?.onerror?.({ error: "interrupted" })),
};

beforeEach(() => {
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
});
afterEach(() => {
  utterances.length = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("speak", () => {
  test("calls onEnd once MEDCLE has finished speaking", () => {
    const onEnd = vi.fn();
    speak("I heard: amoxicillin.", onEnd);
    expect(onEnd).not.toHaveBeenCalled();
    utterances[0]!.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  test("does not call onEnd when stopped or replaced", () => {
    const first = vi.fn();
    speak("First", first);
    const second = vi.fn();
    speak("Second", second);
    utterances[0]!.onend?.(); // Some browsers report a cancelled utterance as ended.
    expect(first).not.toHaveBeenCalled();

    stopSpeaking();
    utterances[1]!.onend?.();
    expect(second).not.toHaveBeenCalled();
  });

  test("calls onEnd when speech fails, so listening can still start", () => {
    const onEnd = vi.fn();
    speak("I heard: amoxicillin.", onEnd);
    utterances[0]!.onerror?.({ error: "not-allowed" });
    expect(onEnd).toHaveBeenCalledOnce();
  });

  test("without speech support, calls onEnd right away", async () => {
    vi.unstubAllGlobals();
    const onEnd = vi.fn();
    speak("I heard: amoxicillin.", onEnd);
    await Promise.resolve();
    expect(onEnd).toHaveBeenCalledOnce();
  });
});
