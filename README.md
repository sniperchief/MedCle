# MEDCLE

Helping pharmacists and customers hear the same thing.

Medication names are hard to say. MEDCLE listens to a customer's spoken request at the pharmacy
counter, transcribes it, extracts the medication details that were explicitly stated, and reads the
request back ("I heard: amoxicillin, 500 milligrams. Is that correct?") so the customer can confirm
it. As an optional second check, the pharmacist can repeat the request back and MEDCLE flags any
difference between the two.

MEDCLE is a communication aid. It does not prescribe, diagnose, recommend medication, decide which
dose is correct, or correct what was said. The pharmacist makes every medical decision.

## Pages

- `/` — landing page explaining the problem and how MEDCLE works.
- `/app` — the counter tool.

## How the tool works

1. **Customer speaks.** Audio streams from the browser to
   [AssemblyAI Streaming v3](https://www.assemblyai.com/docs/speech-to-text/universal-streaming)
   using a short-lived token minted by the server. Recording stops by itself at the end of the
   speaker's turn (or with Stop).
2. **Extraction.** The final transcript is sent to Claude (Haiku 4.5) with a strict JSON schema to
   extract medication, strength, quantity and form, exactly as stated. The transcript stays the
   record of what was said.
3. **Readback.** MEDCLE speaks and shows what it heard, using the browser's speech synthesis, with
   *Yes, that's right* / *Say it again* / *Replay*.
4. **Optional pharmacist read-back.** The pharmacist repeats the request; a deterministic,
   field-by-field comparison flags possible mismatches (spoken aloud), which must be confirmed.
   Fields stated by only one side are reported as unconfirmed, not as mismatches.

API keys never reach the browser. Streaming tokens are single-use, must be redeemed within 60
seconds, and cap each session at 10 minutes.

## Requirements

- Node.js 24
- An AssemblyAI API key and an Anthropic API key

## Local development

```sh
npm install
cp .env.example .env   # then set ASSEMBLYAI_API_KEY and ANTHROPIC_API_KEY
npm run dev            # http://localhost:3000
```

| Variable             | Required | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `ASSEMBLYAI_API_KEY` | yes      | AssemblyAI API key for transcription. Server-side only.     |
| `ANTHROPIC_API_KEY`  | yes      | Anthropic API key for medication extraction. Server-side only. |
| `PORT`               | no       | Port for the local server. Defaults to `3000`.              |

Microphone access requires `localhost` or HTTPS.

## Scripts

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Express server with Vite dev middleware and hot reload               |
| `npm run build`     | Type-checks and builds the client into `dist/`                       |
| `npm start`         | Serves the production build and the API with Express                 |
| `npm test`          | Unit and component tests (no network)                                |
| `npm run test:live` | Extraction tests against the real Claude API (billed; needs the key) |
| `npm run typecheck` | Type-checks client, server, functions and tests                      |
| `npm run lint`      | Lints the project                                                    |

## Deploying to Vercel

On Vercel the Vite build is served as static files and the two API routes run as Vercel Functions
from `api/`. They share their logic with the local Express server (`server/`), so behaviour is the
same in both places. `vercel.json` sets the build and serves the app shell at `/app`.

1. Import the GitHub repository in Vercel (**Add New → Project**). The settings come from
   `vercel.json`; Node 24 comes from `package.json`.
2. Add `ASSEMBLYAI_API_KEY` and `ANTHROPIC_API_KEY` under **Settings → Environment Variables**
   for Production and Preview. Changes apply to new deployments, so redeploy after adding them.
3. Deploy, then test the preview URL (HTTPS, so the microphone works on phones too).
4. Protect the paid APIs before sharing the URL:
   - **Firewall → rate limit** rule on `/api/` (e.g. 20 requests per minute per IP).
   - Spending limits in the AssemblyAI and Anthropic dashboards.

Vercel's Hobby plan is for non-commercial use; a commercial pilot needs a paid plan.

## Code layout

```
api/                         Vercel Functions (thin wrappers around server/ logic)
  streaming-token.ts         POST /api/streaming-token
  extract-medication.ts      POST /api/extract-medication
server/
  index.ts                   Local/production Express server (API + Vite or static files)
  streaming-token.ts         Token route logic
  medication-extraction.ts   Extraction prompt, schema, Claude call, validation, route logic
  api-result.ts              Route results and their Express / Web Response adapters
  config.ts                  Environment variables
shared/
  medication-request.ts      The MedicationRequest type
src/
  landing/                   Landing page sections
  transcription/             Microphone capture, AssemblyAI session lifecycle, React state
  extraction/                Calls the extraction endpoint; extraction state with retry
  comparison/                Deterministic customer vs pharmacist comparison
  voice/                     Spoken readback and mismatch warning (SpeechSynthesis)
  components/                Speaker panels, readback, comparison, mismatch confirmation
  router.tsx                 Two-route client router ("/" and "/app")
```
