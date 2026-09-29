import { TranscriptionError } from "./errors";
import workletUrl from "./pcm16-chunker.worklet.ts?worker&url";

export interface Microphone {
  /** Sample rate of the PCM chunks: the device's native capture rate. */
  readonly sampleRate: number;
  /** Starts delivering 16-bit PCM chunks. Nothing is captured before this. */
  start(onChunk: (chunk: ArrayBuffer) => void): void;
  /** Stops capture and releases the device. Safe to call more than once. */
  close(): Promise<void>;
}

/** Asks for microphone access and prepares a PCM16 capture pipeline. */
export async function openMicrophone(): Promise<Microphone> {
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
    throw new TranscriptionError("unsupported-browser");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    throw microphoneError(error);
  }

  // The AudioContext runs at the device's native rate: forcing a rate is not
  // reliable across browsers, and AssemblyAI accepts any rate from 8–96 kHz.
  const context = new AudioContext();
  try {
    await context.audioWorklet.addModule(workletUrl);
    await context.resume();
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    throw new TranscriptionError("unsupported-browser", { cause: error });
  }

  const source = context.createMediaStreamSource(stream);
  const chunker = new AudioWorkletNode(context, "pcm16-chunker", { numberOfOutputs: 0 });
  let closed = false;

  return {
    sampleRate: context.sampleRate,
    start(onChunk) {
      chunker.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data);
      source.connect(chunker);
    },
    async close() {
      if (closed) return;
      closed = true;
      chunker.port.onmessage = null;
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
}

function microphoneError(error: unknown): TranscriptionError {
  const name = error instanceof DOMException ? error.name : undefined;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new TranscriptionError("microphone-permission", { cause: error });
    case "NotFoundError":
    case "OverconstrainedError":
      return new TranscriptionError("microphone-unavailable", { cause: error });
    default:
      return new TranscriptionError("microphone-busy", { cause: error });
  }
}
