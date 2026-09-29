import { StreamingTranscriber, type TurnEvent } from "assemblyai/streaming";
import { TranscriptionError, fromStreamingError } from "./errors";
import { openMicrophone, type Microphone } from "./microphone";
import { fetchStreamingToken } from "./streaming-token";

export type TranscriptionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "stopping"
  | "completed"
  | "error";

export interface TranscriptionSessionCallbacks {
  onStatusChange(status: TranscriptionStatus): void;
  onTurn(turn: TurnEvent): void;
  onError(error: TranscriptionError): void;
}

const SPEECH_MODEL = "universal-3-6-pro";
// Generous connect timeout (the SDK default is 1 s). Retries are disabled
// because a streaming token is single-use; the user can simply start again.
const CONNECT_TIMEOUT_MS = 10_000;
// How long to wait for AssemblyAI to deliver the final turn after we stop.
const TERMINATION_TIMEOUT_MS = 5_000;
// End-of-turn silence, generous so hesitant speakers ("amoxic… amoxicillin")
// aren't cut off: a confident end of turn needs at least MIN of silence, and
// any turn ends after MAX. Ending the first turn stops the recording.
export const MIN_TURN_SILENCE_MS = 1_000;
export const MAX_TURN_SILENCE_MS = 2_000;

/** Interrupts a pending connection step when the user stops the session. */
class SessionStopped extends Error {}

/**
 * One microphone → AssemblyAI Streaming v3 session, from connecting until the
 * final transcript has arrived. A session runs once; create a new one to record again.
 */
export class TranscriptionSession {
  private readonly callbacks: TranscriptionSessionCallbacks;
  private readonly tokenRequest = new AbortController();
  private readonly ended: Promise<void>;
  private settleEnded!: { resolve: () => void; reject: (error: TranscriptionError) => void };
  private microphone?: Microphone;
  private transcriber?: StreamingTranscriber;
  private stopRequested = false;
  private listening = false;

  constructor(callbacks: TranscriptionSessionCallbacks) {
    this.callbacks = callbacks;
    // Resolves when the user stops; rejects if the session fails first.
    this.ended = new Promise((resolve, reject) => {
      this.settleEnded = { resolve, reject };
    });
    this.ended.catch(() => {}); // Observed in run(); avoid unhandled-rejection noise.
  }

  /** Runs the whole session. Resolves once every resource has been released. */
  async run(): Promise<void> {
    let finalStatus: TranscriptionStatus;
    try {
      await this.transcribe();
      finalStatus = "completed";
    } catch (error) {
      if (this.stopRequested && !this.listening) {
        // Stopped while connecting. Any error here (e.g. the aborted token
        // request) is a consequence of the stop, not a failure.
        finalStatus = "idle";
      } else {
        const failure =
          error instanceof TranscriptionError
            ? error
            : new TranscriptionError("session-ended", { cause: error });
        console.error(`[MEDCLE] Transcription failed (${failure.kind}):`, failure.cause ?? failure);
        this.callbacks.onError(failure);
        finalStatus = "error";
      }
    }
    await this.release();
    this.callbacks.onStatusChange(finalStatus);
  }

  /** Requests the session to stop. Safe to call at any point, any number of times. */
  stop(): void {
    if (this.stopRequested) return;
    this.stopRequested = true;
    this.tokenRequest.abort();
    this.settleEnded.resolve();
  }

  private async transcribe(): Promise<void> {
    this.callbacks.onStatusChange("connecting");

    this.microphone = await this.untilStopped(openMicrophone(), (mic) => void mic.close());
    const token = await this.untilStopped(fetchStreamingToken(this.tokenRequest.signal));
    this.transcriber = this.createTranscriber(token, this.microphone.sampleRate);
    try {
      await this.untilStopped(this.transcriber.connect());
    } catch (error) {
      throw fromStreamingError(error, "connection");
    }

    this.microphone.start((chunk) => this.sendAudio(chunk));
    this.listening = true;
    this.callbacks.onStatusChange("listening");

    await this.ended; // Until the user stops (resolves) or the session fails (rejects).

    this.callbacks.onStatusChange("stopping");
    await this.microphone.close();
    // Sends Terminate and waits for AssemblyAI's Termination message, so the
    // final turn arrives before the socket closes.
    await this.transcriber.close(true, TERMINATION_TIMEOUT_MS);
  }

  private createTranscriber(token: string, sampleRate: number): StreamingTranscriber {
    const transcriber = new StreamingTranscriber({
      token,
      sampleRate,
      encoding: "pcm_s16le",
      speechModel: SPEECH_MODEL,
      connectTimeout: CONNECT_TIMEOUT_MS,
      maxConnectionRetries: 0,
      minTurnSilence: MIN_TURN_SILENCE_MS,
      maxTurnSilence: MAX_TURN_SILENCE_MS,
    });
    transcriber.on("open", (begin) => {
      console.debug(`[MEDCLE] AssemblyAI session ${begin.id} started`, begin);
    });
    transcriber.on("turn", (turn) => {
      this.callbacks.onTurn(turn);
      // The speaker has finished what they were saying: stop listening, just
      // as if Stop had been pressed. Silence alone (an empty turn) doesn't count.
      if (turn.end_of_turn && turn.transcript.trim()) this.stop();
    });
    transcriber.on("error", (error) => {
      this.fail(fromStreamingError(error, "session-ended"));
    });
    transcriber.on("close", (code, reason) => {
      // Only meaningful before the user stops: afterwards the session has
      // already ended and fail() is a no-op.
      this.fail(fromStreamingError({ code, message: reason }, "session-ended"));
    });
    return transcriber;
  }

  private sendAudio(chunk: ArrayBuffer): void {
    try {
      this.transcriber?.sendAudio(chunk);
    } catch {
      // The socket is no longer open. The transcriber's close listener reports
      // the specific reason, so this chunk is simply dropped.
    }
  }

  private fail(error: TranscriptionError): void {
    // A no-op once the session has already ended (stopped or failed).
    this.settleEnded.reject(error);
  }

  /**
   * Waits for `work`, but gives up as soon as the session ends. If `work`
   * completes after giving up, its result is handed to `dispose` for cleanup.
   */
  private async untilStopped<T>(work: Promise<T>, dispose?: (value: T) => void): Promise<T> {
    const interrupted = this.ended.then(() => {
      throw new SessionStopped();
    });
    try {
      return await Promise.race([work, interrupted]);
    } catch (error) {
      work.then(dispose, () => {});
      throw error;
    }
  }

  /** Releases the microphone and socket. Idempotent; runs on every exit path. */
  private async release(): Promise<void> {
    await Promise.allSettled([this.microphone?.close(), this.transcriber?.close(false)]);
  }
}
