import { GoogleGenAI, Type } from "@google/genai";
import { ArchetypeID } from "../types";

export const getPsychologicalProfile = async (
  stats: { strikes: number; shields: number; gambles: number; observes: number; total: number; win: boolean },
  archetype: ArchetypeID
): Promise<{ title: string; text: string } | null> => {
  // If no API key is present, fallback to local engine
  if (!process.env.API_KEY) {
    console.warn("No API_KEY found, falling back to local engine.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    You are 'The Mirror', a cryptic and philosophical psychological analyzer in a game.
    Analyze the recent match data to provide a deep insight into the player's psyche.
    
    Opponent Archetype: ${archetype}
    Result: ${stats.win ? "Victory" : "Defeat"}
    
    Player Statistics:
    - Strikes (Aggression): ${stats.strikes}
    - Shields (Defense): ${stats.shields}
    - Gambles (Risk-taking): ${stats.gambles}
    - Observes (Patience/Tactics): ${stats.observes}
    - Total Moves: ${stats.total}
    
    Based on this, generate a JSON object with:
    1. 'title': A short, evocative 2-3 word title (e.g., "The Calculative Shadow", "Blind Rage").
    2. 'text': A deep, slightly abstract or philosophical insight about their behavior (max 2 sentences).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        // High thinking budget for deep psychological profiling
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                text: { type: Type.STRING }
            }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Insight Generation Failed:", error);
    return null;
  }
};