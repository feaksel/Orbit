import { GoogleGenAI, Type } from "@google/genai";
import { Person } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for the conversational parser
const PARSER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    identifiedNames: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Names of people mentioned in the text",
    },
    date: {
      type: Type.STRING,
      description: "Date of the interaction in ISO 8601 format. If relative (e.g. 'yesterday'), calculate based on today.",
    },
    interactionType: {
      type: Type.STRING,
      enum: ["Call", "Meeting", "Message", "Email", "Social", "Other"],
      description: "The type of interaction",
    },
    summary: {
      type: Type.STRING,
      description: "A concise summary of what happened or what was discussed.",
    },
    sentiment: {
      type: Type.STRING,
      enum: ["positive", "neutral", "negative"],
      description: "The implied sentiment of the interaction",
    },
    isNewContact: {
      type: Type.BOOLEAN,
      description: "True if the text implies meeting someone for the first time",
    }
  },
  required: ["identifiedNames", "date", "interactionType", "summary", "sentiment"],
};

export const parseConversationalInput = async (input: string, existingPeople: Person[]) => {
  const today = new Date().toISOString().split('T')[0];
  const context = `
    Today is ${today}.
    Existing contacts in the database: ${existingPeople.map(p => p.name).join(', ')}.
    User input: "${input}"
    
    Analyze the user input. Match names to existing contacts if possible (fuzzy match).
    If the user says "Just met [Name]", set isNewContact to true.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
      config: {
        responseMimeType: 'application/json',
        responseSchema: PARSER_SCHEMA,
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};
