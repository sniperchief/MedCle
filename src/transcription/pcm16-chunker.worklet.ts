// AudioWorklet that converts mono Float32 microphone samples to 16-bit
// little-endian PCM and posts them to the main thread in fixed-size chunks.
// AssemblyAI requires each streamed chunk to hold 50–1000 ms of audio.

// Globals of AudioWorkletGlobalScope, which TypeScript's DOM lib doesn't declare.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void;

const CHUNK_DURATION_SECONDS = 0.1;

class Pcm16ChunkerProcessor extends AudioWorkletProcessor {
  private readonly chunk = new Int16Array(Math.round(sampleRate * CHUNK_DURATION_SECONDS));
  private length = 0;

  process(inputs: Float32Array[][]): boolean {
    const samples = inputs[0]?.[0];
    if (!samples) return true;

    for (const sample of samples) {
      const clamped = Math.max(-1, Math.min(1, sample));
      this.chunk[this.length++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      if (this.length === this.chunk.length) {
        const buffer = this.chunk.slice().buffer;
        this.port.postMessage(buffer, [buffer]);
        this.length = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm16-chunker", Pcm16ChunkerProcessor);

export {};
