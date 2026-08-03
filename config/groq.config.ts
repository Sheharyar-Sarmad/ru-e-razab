// config/groq.config.ts
import Groq from "groq-sdk";
import EnvSecrets from "./env.secrets";
import { SYSTEM_PROMPTS, getSystemPrompt } from "../lib/system.prompt";

// VALIDATE ENVIRONMENT VARIABLES
const requiredGroqVars = [EnvSecrets.groqApiKey];
const missingVars = requiredGroqVars.filter(v => !v);
if (missingVars.length > 0) {
  throw new Error(`Missing GROQ_API_KEY. Please check your .env file.`);
}

// GROQ CLIENT
export const groq = new Groq({
  apiKey: EnvSecrets.groqApiKey as string,
});

// ✅ ACTIVE MODELS
export const GROQ_MODELS = {
  LLAMA_3_70B: "llama-3.3-70b-versatile",     // Latest 70B model
  LLAMA_3_8B: "llama-3.1-8b-instant",          // Fast 8B model
  MIXTRAL: "mixtral-8x7b-32768",               // Mixtral
  GEMMA: "gemma2-9b-it",                       // Google Gemma
  DEEPSEEK: "deepseek-r1-distill-llama-70b",   // DeepSeek
} as const;

export type GroqModel = typeof GROQ_MODELS[keyof typeof GROQ_MODELS];

// CONFIG INTERFACE
export interface GroqConfig {
  model: GroqModel;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

// ✅ UPDATED DEFAULT CONFIG
export const DEFAULT_GROQ_CONFIG: GroqConfig = {
  model: GROQ_MODELS.LLAMA_3_70B,
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// ✅ UPDATED USE CASE CONFIGS
export const GROQ_CONFIGS = {
  creative: {
    model: GROQ_MODELS.LLAMA_3_70B,
    temperature: 0.9,
    maxTokens: 2048,
    topP: 0.95,
    frequencyPenalty: 0.2,
    presencePenalty: 0.2,
  },
  
  analytical: {
    model: GROQ_MODELS.LLAMA_3_70B,
    temperature: 0.3,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  translation: {
    model: GROQ_MODELS.MIXTRAL,
    temperature: 0.2,
    maxTokens: 1024,
    topP: 0.8,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  summarization: {
    model: GROQ_MODELS.LLAMA_3_8B,
    temperature: 0.2,
    maxTokens: 512,
    topP: 0.8,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  poetry: {
    model: GROQ_MODELS.DEEPSEEK,
    temperature: 0.85,
    maxTokens: 1024,
    topP: 0.95,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3,
  },
  
  chat: {
    model: GROQ_MODELS.LLAMA_3_70B,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  },
  
  support: {
    model: GROQ_MODELS.LLAMA_3_70B,
    temperature: 0.3,
    maxTokens: 1024,
    topP: 0.8,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  
  fast: {
    model: GROQ_MODELS.LLAMA_3_8B,
    temperature: 0.5,
    maxTokens: 512,
    topP: 0.8,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
} as const;

export type GroqConfigType = keyof typeof GROQ_CONFIGS;

// HELPERS
export function getGroqConfig(type: GroqConfigType): GroqConfig {
  return GROQ_CONFIGS[type] as GroqConfig;
}

// EXPORTS
export {
  SYSTEM_PROMPTS,
  getSystemPrompt,
};

export default {
  groq,
  GROQ_MODELS,
  DEFAULT_GROQ_CONFIG,
  GROQ_CONFIGS,
  SYSTEM_PROMPTS,
  getGroqConfig,
  getSystemPrompt,
};