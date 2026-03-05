
import { GoogleGenAI } from "@google/genai";

export const generateDashboardInsight = async (data) => {
    try {
        // Corrected initialization: Always use this pattern as per Gemini SDK guidelines
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `
      You are an executive AI assistant for a safety compliance firm called "Sahaj Group".
      Analyze the following dashboard JSON data and provide a brief, professional executive summary.
      
      Data:
      ${JSON.stringify(data, null, 2)}

      Focus on:
      1. Immediate risks (Expired records and 7-day critical).
      2. Operational volume (Total clients and assets).
      3. A specific recommendation for the manager.

      Keep the tone formal and concise (max 3 sentences).
    `;

        // Direct model call without intermediate model definition
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        // Accessing .text as a property as required
        return response.text || "Unable to generate insights at this time.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "AI Service is currently unavailable. Please check your API key.";
    }
};
