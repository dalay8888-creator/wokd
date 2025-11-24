import { GoogleGenAI, Type } from "@google/genai";

export const generateGameReport = async (
  mastered: string[],
  missed: string[]
): Promise<{ story: string; tips: string[] }> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("No API Key found for Gemini");
      return {
        story: "Great job practicing! (Add API Key for AI stories)",
        tips: ["Keep practicing!"]
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      The user just played a vocabulary shooting game.
      Mastered words: ${mastered.join(', ')}.
      Missed words: ${missed.join(', ')}.
      
      Task:
      1. Write a very short, funny, 2-sentence story using as many "Mastered words" as possible.
      2. Provide a list of short mnemonic memory tips for the "Missed words".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: { type: Type.STRING },
            tips: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['story', 'tips']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      story: "You are a vocabulary warrior!",
      tips: ["Try saying the words out loud while typing."]
    };
  }
};