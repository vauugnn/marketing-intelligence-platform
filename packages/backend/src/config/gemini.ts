import { GoogleGenerativeAI } from '@google/generative-ai';

export const GEMINI_MODEL = 'gemini-2.0-flash';

export const generationConfig = {
  temperature: 0.2,
  responseMimeType: 'application/json' as const,
};

let geminiClient: GoogleGenerativeAI | null = null;
let initialized = false;

export function getGeminiClient(): GoogleGenerativeAI | null {
  if (initialized) return geminiClient;
  initialized = true;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return null;
  }

  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}
