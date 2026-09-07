const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.5-flash';
const FALLBACK_URGENCY = 'low';
const VALID_URGENCY = new Set(['low', 'medium', 'high']);
const REQUEST_TIMEOUT_MS = 5000;

const analyzeUrgency = async (messageText) => {
  if (!messageText?.trim() || !process.env.GEMINI_API_KEY) {
    return FALLBACK_URGENCY;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = [
    'Evaluate the urgency of this vehicle alert message.',
    'Return ONLY one word: low, medium, or high.',
    `Message: ${messageText.trim()}`,
  ].join('\n');

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini urgency analysis timed out')), REQUEST_TIMEOUT_MS);
      }),
    ]);
    const urgency = response.text?.trim().toLowerCase();

    return VALID_URGENCY.has(urgency) ? urgency : FALLBACK_URGENCY;
  } catch (error) {
    console.error('Gemini urgency analysis failed:', error.message);
    return FALLBACK_URGENCY;
  }
};

module.exports = { analyzeUrgency };
