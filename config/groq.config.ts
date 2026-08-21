// config/groq.config.ts
import Groq from "groq-sdk";
import EnvSecrets from "./env.secrets";
import { SYSTEM_PROMPTS, getSystemPrompt } from "../lib/system.prompt";

const requiredGroqVars = [EnvSecrets.groqApiKey];
const missingVars = requiredGroqVars.filter(v => !v);
if (missingVars.length > 0) {
  throw new Error(`Missing GROQ_API_KEY. Please check your .env file.`);
}

export const groq = new Groq({
  apiKey: EnvSecrets.groqApiKey as string,
});

// ---------- Dynamic model list ----------
let cachedModels: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAvailableModels(): Promise<string[]> {
  // If cache is fresh, return it
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const response = await groq.models.list();
    const models = response.data.map(m => m.id);
    // Only cache non‑empty results
    if (models.length > 0) {
      cachedModels = models;
      cacheTimestamp = Date.now();
      console.log(`Fetched ${models.length} models:`, models);
      return models;
    } else {
      // If API returns empty, clear cache and return empty
      cachedModels = null;
      cacheTimestamp = 0;
      console.warn("⚠️ Groq API returned empty model list.");
      return [];
    }
  } catch (error) {
    console.error("❌ Failed to fetch models from Groq:", error);
    cachedModels = null;
    cacheTimestamp = 0;
    return [];
  }
}

// ---------- Configuration ----------
export interface GroqConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export function getGroqConfig(
  type: 'chat' | 'creative' | 'analytical' | 'translation' | 'summarization' | 'poetry' | 'support' | 'fast'
): GroqConfig {
  const configs: Record<string, GroqConfig> = {
    chat:       { model: "", temperature: 0.7, maxTokens: 2048, topP: 0.9, frequencyPenalty: 0.1, presencePenalty: 0.1 },
    creative:   { model: "", temperature: 0.9, maxTokens: 2048, topP: 0.95, frequencyPenalty: 0.2, presencePenalty: 0.2 },
    analytical: { model: "", temperature: 0.3, maxTokens: 2048, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
    translation:{ model: "", temperature: 0.2, maxTokens: 1024, topP: 0.8, frequencyPenalty: 0, presencePenalty: 0 },
    summarization:{ model: "", temperature: 0.2, maxTokens: 512, topP: 0.8, frequencyPenalty: 0, presencePenalty: 0 },
    poetry:     { model: "", temperature: 0.85, maxTokens: 1024, topP: 0.95, frequencyPenalty: 0.3, presencePenalty: 0.3 },
    support:    { model: "", temperature: 0.3, maxTokens: 1024, topP: 0.8, frequencyPenalty: 0, presencePenalty: 0 },
    fast:       { model: "", temperature: 0.5, maxTokens: 512, topP: 0.8, frequencyPenalty: 0, presencePenalty: 0 },
  };
  return configs[type] || configs.chat;
}

export { SYSTEM_PROMPTS, getSystemPrompt };

export default {
  groq,
  getAvailableModels,
  getGroqConfig,
  SYSTEM_PROMPTS,
  getSystemPrompt,
};