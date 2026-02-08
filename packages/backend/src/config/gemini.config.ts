/**
 * Gemini AI Configuration
 *
 * Initializes and exports the Google Generative AI client
 * for use in AI-powered recommendation generation.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Validate API key is present
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.warn(
        'Warning: GEMINI_API_KEY not set. AI recommendations will not be available.'
    );
}

// Initialize the Google Generative AI client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Get the Gemini model for text generation
 * Uses gemini-1.5-flash for fast, cost-effective responses
 */
export function getGeminiModel(): GenerativeModel | null {
    if (!genAI) {
        return null;
    }

    return genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        },
    });
}

/**
 * Check if Gemini AI is available
 */
export function isGeminiAvailable(): boolean {
    return genAI !== null;
}

export { genAI };
