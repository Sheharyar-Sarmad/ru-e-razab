// config/groq.config.ts
import Groq from "groq-sdk";
import EnvSecrets from "./env.secrets";
import { SYSTEM_PROMPTS, getSystemPrompt } from "../lib/system.prompt";

if (!EnvSecrets.groqApiKey) {
  throw new Error("Missing GROQ_API_KEY in env");
}

export const groq = new Groq({
  apiKey: EnvSecrets.groqApiKey as string,
});

/* =========================================================
   MODEL
========================================================= */
export const GROQ_MODEL = "openai/gpt-oss-120b";

/* =========================================================
   PRESETS
========================================================= */
export type GroqPreset =
  | "chat"
  | "creative"
  | "analytical"
  | "translation"
  | "summarization"
  | "poetry"
  | "support"
  | "fast";

export interface GroqConfig {
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

const PRESETS: Record<GroqPreset, GroqConfig> = {
  chat:          { temperature: 0.7,  max_tokens: 2048, top_p: 0.9,  frequency_penalty: 0.1, presence_penalty: 0.1 },
  creative:      { temperature: 0.9,  max_tokens: 2048, top_p: 0.95, frequency_penalty: 0.2, presence_penalty: 0.2 },
  analytical:    { temperature: 0.3,  max_tokens: 2048, top_p: 0.9,  frequency_penalty: 0,   presence_penalty: 0 },
  translation:   { temperature: 0.2,  max_tokens: 1024, top_p: 0.8,  frequency_penalty: 0,   presence_penalty: 0 },
  summarization: { temperature: 0.2,  max_tokens: 512,  top_p: 0.8,  frequency_penalty: 0,   presence_penalty: 0 },
  poetry:        { temperature: 0.85, max_tokens: 1024, top_p: 0.95, frequency_penalty: 0.3, presence_penalty: 0.3 },
  support:       { temperature: 0.3,  max_tokens: 1024, top_p: 0.8,  frequency_penalty: 0,   presence_penalty: 0 },
  fast:          { temperature: 0.5,  max_tokens: 512,  top_p: 0.8,  frequency_penalty: 0,   presence_penalty: 0 },
};

export function getGroqConfig(preset: GroqPreset = "chat"): GroqConfig {
  return PRESETS[preset] ?? PRESETS.chat;
}

/* =========================================================
   EXPORTS
========================================================= */
export { SYSTEM_PROMPTS, getSystemPrompt };

export default {
  groq,
  GROQ_MODEL,
  getGroqConfig,
  SYSTEM_PROMPTS,
  getSystemPrompt,
};