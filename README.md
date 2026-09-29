# MEDCLE

Helping pharmacists and customers hear the same thing.

- **Phase 1** transcribes the customer and the pharmacist in real time, in two separate sessions, using
  [AssemblyAI Streaming Speech-to-Text v3](https://www.assemblyai.com/docs/speech-to-text/universal-streaming).
- **Phase 2** extracts the stated medication, strength, quantity and form from each completed transcript
  using Claude. It extracts only: no corrections, no inference, no medical advice.
- **Phase 3** compares the two extracted requests field by field and flags possible mismatches for
  the pharmacist to confirm. The comparison is deterministic (no LLM, no medical knowledge): only case
  and spacing are ignored, and a field stated by only one side is reported as unconfirmed, not as a
  mismatch.

## Requirements

- Node.js 22.18 or newer (the server runs TypeScript natively)
- An AssemblyAI API key and an Anthropic API key

## Setup

```sh
npm install
cp .env.example .env   # then set ASSEMBLYAI_API_KEY and ANTHROPIC_API_KEY in .env
```

| Variable             | Required | Description                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| `ASSEMBLYAI_API_KEY` | yes      | AssemblyAI API key for transcription. Used only on the server.     |
| `ANTHROPIC_API_KEY`  | yes      | Anthropic API key for medication extraction. Used only on the server. |
| `PORT`               | no       | Port for the server. Defaults to `3000`.                           |

## Scripts

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Server and Vite dev middleware with hot reload at `localhost:3000`     |
| `npm run build`     | Type-checks and builds the client into `dist/`                        |
| `npm start`         | Serves the production build and the API endpoints                     |
| `npm run typecheck` | Type-checks the client and server                                     |
| `npm run lint`      | Lints the project                                                     |
| `npm test`          | Unit tests: extraction validation, endpoint, comparison (no network)  |
| `npm run test:live` | Extraction tests against the real Claude API (billed; needs the key)  |

Microphone access requires `localhost` or HTTPS.

## How it works

```
Browser                                   Server                     AssemblyAI / Anthropic
───────                                   ──────                     ──────────────────────
Start Recording
  getUserMedia → AudioWorklet (PCM16, 100 ms chunks)
  POST /api/streaming-token ───────────▶  GET /v3/token (API key) ─▶
                            ◀─────────── single-use token ◀────────
  StreamingTranscriber (assemblyai SDK) ── wss://streaming.assemblyai.com/v3/ws?token=… ──▶
  ◀── Turn messages (partial and end-of-turn) ──
Stop Recording
  stop mic → Terminate → wait for Termination → close socket
  final transcript shown
  POST /api/extract-medication ────────▶  Claude (structured JSON) ─▶
                            ◀─────────── { medication, strength, quantity, form }
```

- The permanent API keys never reach the browser. The server mints a single-use AssemblyAI token that
  must be redeemed within 60 seconds and caps each session at 10 minutes.
- Audio is captured at the device's native sample rate and sent as 16-bit PCM.
- Each speaker panel owns an independent `TranscriptionSession` and extraction, so nothing mixes.
- Extraction runs once per completed recording, never on partial transcripts. Its result is shown
  beneath the transcript and never replaces it. A failed extraction shows a Retry button and leaves the
  transcript untouched.
- The comparison is derived from both current extractions, so it appears only when both have succeeded
  and disappears as soon as either side records again.

### Code layout

```
shared/
  medication-request.ts  The MedicationRequest type (client and server)
server/
  index.ts               Express app: API endpoints + Vite (dev) or static files (prod)
  streaming-token.ts     POST /api/streaming-token
  medication-extraction.ts  POST /api/extract-medication: prompt, schema, Claude call, validation
  config.ts              Environment variables
src/
  transcription/
    transcription-session.ts  One session's lifecycle: mic → token → connect → stream → terminate
    useTranscription.ts       React state for one speaker
    microphone.ts             Microphone capture and PCM16 AudioWorklet pipeline
    pcm16-chunker.worklet.ts  AudioWorklet: Float32 → Int16 chunks
    streaming-token.ts        Fetches a token from the server
    errors.ts                 User-facing error messages and AssemblyAI error-code mapping
  comparison/
    compare-medication-requests.ts  Deterministic Customer vs Pharmacist comparison (+ tests)
  extraction/
    extract-medication.ts     Calls the extraction endpoint
    useMedicationExtraction.ts  Extraction state for one completed transcript, with retry
  components/                 SpeakerPanel, StatusIndicator, MedicationRequestView, ComparisonView,
                              useSpeaker (one speaker's transcription + extraction)
```
