// Runs under Vitest (it needs module mocks), hence the .tsx extension.
import { afterEach, describe, expect, test, vi } from "vitest";
import type { TurnEvent } from "assemblyai/streaming";
import {
  MAX_TURN_SILENCE_MS,
  MIN_TURN_SILENCE_MS,
  TranscriptionSession,
  type TranscriptionStatus,
} from "./transcription-session";

const fakes = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  class FakeTranscriber {
    static instances: FakeTranscriber[] = [];
    readonly params: Record<string, unknown>;
    readonly listeners: Record<string, Listener> = {};
    closeCalls: unknown[][] = [];

    constructor(params: Record<string, unknown>) {
      this.params = params;
      FakeTranscriber.instances.push(this);
    }
    on(event: string, listener: Listener) {
      this.listeners[event] = listener;
    }
    async connect() {
      return { type: "Begin", id: "session" };
    }
    sendAudio() {}
    async close(...args: unknown[]) {
      this.closeCalls.push(args);
    }
    emitTurn(turn: Partial<TurnEvent>) {
      this.listeners.turn?.({ turn_order: 0, turn_is_formatted: true, words: [], ...turn });
    }
  }

  const microphone = { sampleRate: 48_000, start: vi.fn(), close: vi.fn(async () => {}) };
  return { FakeTranscriber, microphone };
});

vi.mock("assemblyai/streaming", () => ({ StreamingTranscriber: fakes.FakeTranscriber }));
vi.mock("./microphone", () => ({ openMicrophone: vi.fn(async () => fakes.microphone) }));
vi.mock("./streaming-token", () => ({ fetchStreamingToken: vi.fn(async () => "token") }));

async function startSession() {
  const statuses: TranscriptionStatus[] = [];
  const turns: string[] = [];
  const session = new TranscriptionSession({
    onStatusChange: (status) => statuses.push(status),
    onTurn: (turn) => turns.push(turn.transcript),
    onError: (error) => {
      throw error;
    },
  });
  const finished = session.run();
  await vi.waitFor(() => expect(statuses).toContain("listening"));
  const transcriber = fakes.FakeTranscriber.instances.at(-1)!;
  return { session, finished, statuses, turns, transcriber };
}

afterEach(() => {
  fakes.FakeTranscriber.instances = [];
  vi.clearAllMocks();
});

describe("auto-stop at the end of the speaker's turn", () => {
  test("asks AssemblyAI for generous end-of-turn silence", async () => {
    const { session, finished, transcriber } = await startSession();
    expect(transcriber.params).toMatchObject({
      minTurnSilence: MIN_TURN_SILENCE_MS,
      maxTurnSilence: MAX_TURN_SILENCE_MS,
    });
    session.stop();
    await finished;
  });

  test("keeps listening through partial turns (hesitations)", async () => {
    const { session, finished, statuses, transcriber } = await startSession();
    transcriber.emitTurn({ end_of_turn: false, transcript: "I need amoxic" });
    transcriber.emitTurn({ end_of_turn: false, transcript: "I need amoxic amoxicillin" });
    expect(statuses.at(-1)).toBe("listening");
    expect(fakes.microphone.close).not.toHaveBeenCalled();
    session.stop();
    await finished;
  });

  test("stops by itself once the turn ends, keeping the final text", async () => {
    const { finished, statuses, turns, transcriber } = await startSession();
    transcriber.emitTurn({ end_of_turn: false, transcript: "I need amoxicillin" });
    transcriber.emitTurn({ end_of_turn: true, transcript: "I need amoxicillin 500 milligrams." });

    await finished;
    expect(statuses.slice(-3)).toEqual(["listening", "stopping", "completed"]);
    expect(turns.at(-1)).toBe("I need amoxicillin 500 milligrams.");
    expect(fakes.microphone.close).toHaveBeenCalled();
    // Terminates the AssemblyAI session properly, waiting for its final message.
    expect(transcriber.closeCalls[0]?.[0]).toBe(true);
  });

  test("an empty end of turn (silence only) does not stop the recording", async () => {
    const { session, finished, statuses, transcriber } = await startSession();
    transcriber.emitTurn({ end_of_turn: true, transcript: "  " });
    expect(statuses.at(-1)).toBe("listening");
    session.stop();
    await finished;
  });

  test("Stop still works before the speaker finishes", async () => {
    const { session, finished, statuses, transcriber } = await startSession();
    transcriber.emitTurn({ end_of_turn: false, transcript: "I need" });
    session.stop();
    await finished;
    expect(statuses.slice(-2)).toEqual(["stopping", "completed"]);
  });

  test("a turn ending after Stop was pressed changes nothing", async () => {
    const { session, finished, statuses, transcriber } = await startSession();
    session.stop();
    transcriber.emitTurn({ end_of_turn: true, transcript: "I need amoxicillin." });
    await finished;
    expect(statuses.filter((status) => status === "completed")).toHaveLength(1);
    expect(transcriber.closeCalls).toHaveLength(2); // terminate, then the idempotent release
  });
});
