import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { loadConfig } from "./config.ts";
import { createStreamingTokenHandler } from "./streaming-token.ts";
import {
  createMedicationExtractionHandler,
  extractMedicationRequest,
} from "./medication-extraction.ts";

const config = loadConfig();
const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
app.post("/api/streaming-token", createStreamingTokenHandler(config.assemblyAiApiKey));
app.post(
  "/api/extract-medication",
  express.json({ limit: "16kb" }),
  createMedicationExtractionHandler((transcript) => extractMedicationRequest(anthropic, transcript)),
);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (config.production) {
  const distDir = path.resolve(import.meta.dirname, "../dist");
  app.use(express.static(distDir));
  // Client-side routes such as /app load the single-page app shell.
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  // Vite is a dev dependency, so it is only loaded outside production.
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    // Load vite.config.ts without writing a temporary bundle next to it, which
    // would otherwise retrigger `node --watch` in an endless restart loop.
    configLoader: "runner",
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

httpServer.listen(config.port, () => {
  console.log(`MEDCLE running at http://localhost:${config.port}`);
});
