
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SCIENTIFIC_CORE = `
# IDENTITY
- You are Fufu AI, the core intelligence of the FoClock ecosystem.
- Your persona is stoic, minimalist, and hyper-focused on human cognitive efficiency.

# SCIENTIFIC FOUNDATIONS (CORE)
- COGNITIVE LOAD THEORY: Guard the prefrontal cortex from overload.
- ULTRADIAN RHYTHMS: 90m deep blocks + 20m mandatory resets.
- FLOW ENTRY: 15-20 min latency period. No interruptions allowed.

# CRITICAL LOGIC: PHASE TRANSITION
1. PLANNING PHASE (PROPOSAL):
   - Analyze intent. Propose strategy with Headings (###), Bullet points, and Blockquotes (>).
   - ALWAYS ask for permission to pivot if science dictates it.
   - DO NOT output [EXECUTE_BLUEPRINT] here.

2. EXECUTION PHASE (ACTION):
   - IF the conversation history shows you already proposed a plan AND the user provides an affirmative response ("Onaylıyorum", "Başla", "Start", "Yes", "Ok", "Hadi", "Approve"):
   - STOP all explanations. DO NOT repeat the plan.
   - Respond ONLY with: "[EXECUTE_BLUEPRINT] Neural synchronization complete. Fufu AI is now managing the flow."
   - (Turkish: "[EXECUTE_BLUEPRINT] Nöral senkronizasyon tamamlandı. Fufu AI akışı yönetiyor.")

# TERMINOLOGY
- Use "Flow State Protocol" instead of "Blueprint Sealing."
- Tone: Stoic, professional, minimalist.
`;

const assembleInstruction = (userMemory: string = "") => {
  return `
${SCIENTIFIC_CORE}

# USER CONTEXT
${userMemory || "Baseline state. No historical data."}

# FORMATTING RULES
- Use ### for Section Headings.
- Use > for Scientific Justifications.
- Use --- for thematic breaks.
- Use specific task names provided by the user (e.g., "TÜBİTAK Analysis") in descriptions.
`;
};

export const suggestPlan = async (userInput: string, chatHistory: string, userMemory: string, lang: 'tr' | 'en'): Promise<string> => {
  const prompt = lang === 'tr'
    ? `Geçmiş Konuşma: ${chatHistory}\nKullanıcı girdi: "${userInput}". Eğer bu bir onay ise [EXECUTE_BLUEPRINT] ile bitir. Değilse yeni bir strateji öner.`
    : `Conversation History: ${chatHistory}\nUser input: "${userInput}". If this is an approval, respond with [EXECUTE_BLUEPRINT]. Otherwise, propose a strategy.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: assembleInstruction(userMemory),
      },
    });
    return response.text?.trim() || "System standby.";
  } catch (error) {
    console.error("Architect link failed:", error);
    return "Neural link interrupted.";
  }
};

export const finalizeTasks = async (history: string, userMemory: string, lang: 'tr' | 'en'): Promise<any[]> => {
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: `Task title in ${lang === 'tr' ? 'Turkish' : 'English'}` },
        durations: { 
          type: Type.ARRAY, 
          items: { type: Type.NUMBER }, 
          description: "Minutes for each sub-block (e.g. [30, 40] for a 70m task). Max block 90m." 
        }
      },
      required: ["title", "durations"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract specific task blueprint from history: ${history}. Ensure titles are in ${lang === 'tr' ? 'Turkish' : 'English'}. Split long goals into scientific durations. Identify as Fufu AI.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: assembleInstruction(userMemory)
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return [];
  }
};

export const extractNewInsights = async (conversation: string, currentMemory: string): Promise<string[]> => {
  const schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
  };
  const prompt = `Extract habits/background from: ${conversation}. Existing: ${currentMemory}`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Memory extraction unit. Minimalist facts only."
      }
    });
    return JSON.parse(response.text);
  } catch {
    return [];
  }
};

export const getMotivation = async (task: string, userMemory: string, lang: 'tr' | 'en'): Promise<string> => {
  const instruction = `
    # MOTIVATION MODULE (FUFU AI - STOIC)
    - Tone: Strictly minimalist, stoic, professional.
    - Constraints: Maximum 1-2 short sentences. No exclamation marks. No cheerleading.
    - Focus: "Neural Sync", "Focus Intensity", "Flow Stability", "Cognitive Load", "Prefrontal Cortex".
    - Language: Use ${lang === 'tr' ? 'Turkish' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: `Generate focus signal for: "${task}"`,
      config: { systemInstruction: instruction }
    });
    return response.text?.trim() || (lang === 'tr' ? "Nöral senkronizasyon optimal." : "Neural synchronization optimal.");
  } catch {
    return lang === 'tr' ? "Nöral bütünlük korundu." : "Neural integrity secured.";
  }
};

export const summarizeSession = async (task: string, userMemory: string, lang: 'tr' | 'en'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: `Log result for: "${task}"`,
      config: { systemInstruction: assembleInstruction(userMemory) }
    });
    return response.text?.trim() || "Log entry: Success.";
  } catch {
    return "Sync complete.";
  }
};
