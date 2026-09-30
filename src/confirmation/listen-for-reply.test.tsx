// Runs under Vitest (it needs module mocks), hence the .tsx extension.
import { afterEach, describe, expect, test, vi } from "vitest";
import type { TurnEvent } from "assemblyai/streaming";
import { TranscriptionError } from "../transcription/errors";
import type {
  TranscriptionSessionCallbacks,
  TranscriptionStatus,
} from "../transcription/transcription-session";
import { NO_REPLY_TIMEOUT_MS, listenForReply } from "./listen-for-reply";

// A transcription session the test drives: run() resolves once it is stopped.
const fakes = vi.hoisted(() => {
  class FakeSession {
    static instances: FakeSession[] = [];
    readonly callbacks: TranscriptionSessionCallbacks;
    stopped = false;
    private finish!: () => void;
    private readonly finished = new Promise<void>((resolve) => {
      this.finish = resolve;
    });

    constructor(callbacks: TranscriptionSessionCallbacks) {
      this.callbacks = callbacks;
      FakeSession.instances.push(this);
    }
    run() {
      this.callbacks.onStatusChange("connecting");
      this.callbacks.onStatusChange("listening");
      return this.finished;
    }
    stop() {
      if (this.stopped) return;
      this.stopped = true;
      this.end("completed");
    }
    end(status: TranscriptionStatus) {
      this.callbacks.onStatusChange(status);
      this.finish();
    }
    turn(order: number, transcript: string, endOfTurn = false) {
      this.callbacks.onTurn({ turn_order: order, transcript, end_of_turn: endOfTurn } as TurnEvent);
    }
  }
  return { FakeSession };
});

vi.mock("../transcription/transcription-session", () => ({
  TranscriptionSession: fakes.FakeSession,
}));

const session = () => fakes.FakeSession.instances.at(-1)!;

afterEach(() => {
  fakes.FakeSession.instances = [];
  vi.useRealTimers();
});

describe("listenForReply", () => {
  test("resolves with what the customer said, reporting it as it is heard", async () => {
    const heard: string[] = [];
    const reply = listenForReply(new AbortController().signal, (text) => heard.push(text));
    session().turn(0, "Yes");
    session().turn(0, "Yes, that's right.", true);
    session().stop(); // The real session stops itself at the end of the turn.
    await expect(reply).resolves.toBe("Yes, that's right.");
    expect(heard).toEqual(["Yes", "Yes, that's right."]);
  });

  test("gives up with an empty reply when nothing is said", async () => {
    vi.useFakeTimers();
    const reply = listenForReply(new AbortController().signal);
    vi.advanceTimersByTime(NO_REPLY_TIMEOUT_MS);
    expect(session().stopped).toBe(true);
    await expect(reply).resolves.toBe("");
  });

  test("keeps listening past the timeout once the customer has started answering", async () => {
    vi.useFakeTimers();
    const reply = listenForReply(new AbortController().signal);
    session().turn(0, "No, I said");
    vi.advanceTimersByTime(NO_REPLY_TIMEOUT_MS * 2);
    expect(session().stopped).toBe(false);
    session().turn(0, "No, I said 20 tablets.", true);
    session().stop();
    await expect(reply).resolves.toBe("No, I said 20 tablets.");
  });

  test("aborting stops the session and drops what it heard", async () => {
    const controller = new AbortController();
    const reply = listenForReply(controller.signal);
    session().turn(0, "Yes");
    controller.abort();
    expect(session().stopped).toBe(true);
    await expect(reply).rejects.toMatchObject({ name: "AbortError" });
  });

  test("rejects with the transcription error when the session fails", async () => {
    const reply = listenForReply(new AbortController().signal);
    const error = new TranscriptionError("microphone-permission");
    session().callbacks.onError(error);
    session().end("error");
    await expect(reply).rejects.toBe(error);
  });
});
