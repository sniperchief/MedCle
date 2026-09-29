export interface ServerConfig {
  assemblyAiApiKey: string;
  anthropicApiKey: string;
  port: number;
  production: boolean;
}

const DEFAULT_PORT = 3000;

function requireEnv(name: string, description: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and add your ${description}.`);
  }
  return value;
}

export function loadConfig(): ServerConfig {
  const assemblyAiApiKey = requireEnv("ASSEMBLYAI_API_KEY", "AssemblyAI API key");
  const anthropicApiKey = requireEnv("ANTHROPIC_API_KEY", "Anthropic API key");

  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535 (got "${process.env.PORT}").`);
  }

  return {
    assemblyAiApiKey,
    anthropicApiKey,
    port,
    production: process.argv.includes("--production"),
  };
}
