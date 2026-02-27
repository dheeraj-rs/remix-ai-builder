export interface Env {
  ANTHROPIC_API_KEY?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  OPEN_AI?: string;
  OPENAI_API_KEY?: string;
}

export function getAPIKey(cloudflareEnv: Env) {
  return process.env.ANTHROPIC_API_KEY || cloudflareEnv.ANTHROPIC_API_KEY;
}

export function getGoogleAPIKey(cloudflareEnv: Env) {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    cloudflareEnv.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

export function getOpenAIKey(cloudflareEnv: Env) {
  return (
    process.env.OPEN_AI ||
    process.env.OPENAI_API_KEY ||
    cloudflareEnv.OPEN_AI ||
    cloudflareEnv.OPENAI_API_KEY
  );
}
