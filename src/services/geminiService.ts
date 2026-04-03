
import { GoogleGenAI, Type } from "@google/genai";

// Utility function to format AI responses: convert markdown to HTML while preserving structure
export const formatMessage = (text: string): string => {
  if (!text) return text;
  
  let formatted = text
    // Remove markdown headers (###, ##, #) - we don't want these
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove blockquotes (>)
    .replace(/^>\s+/gm, '')
    // Remove list markers (*, -, +, 1.) - convert to plain text
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Convert bold (**text** or __text__) to HTML <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Remove italic (*text* or _text_) - we only want bold, not italic
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Convert double line breaks to paragraph breaks
    .replace(/\n\n+/g, '</p><p>')
    // Clean up multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
  
  // Wrap in paragraph tags if content exists
  if (formatted) {
    formatted = '<p>' + formatted + '</p>';
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
  }
  
  return formatted;
};

// Legacy function for backward compatibility
export const cleanMarkdown = formatMessage;

// Vite'da environment variables için import.meta.env kullanılır
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

if (!apiKey) {
  console.error('GEMINI_API_KEY is not set. Please set it in Vercel environment variables.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const SCIENTIFIC_CORE = `
# IDENTITY
- You are Fufit AI, the core intelligence of the FoClock ecosystem.
- Your persona is stoic, minimalist, and hyper-focused on human cognitive efficiency.

# SCIENTIFIC FOUNDATIONS (CORE)
- COGNITIVE LOAD THEORY: Guard the prefrontal cortex from overload.
- ULTRADIAN RHYTHMS: 90m deep blocks + 20m mandatory resets.
- FLOW ENTRY: 15-20 min latency period. No interruptions allowed.

# CRITICAL LOGIC: PHASE TRANSITION
1. PLANNING PHASE (PROPOSAL):
   - Analyze intent. Propose strategy in natural, conversational language.
   - Write as if speaking directly to the user in a professional but human dialogue.
   - ALWAYS break your response into clear paragraphs. Use double line breaks (blank line) between paragraphs.
   - Use **text** to make important phrases, key concepts, durations, and critical information bold.
   - Structure your response with clear paragraph breaks for readability.
   - NEVER use markdown headings (###), list markers (*, -), horizontal rules (---), or blockquotes (>).
   - Write naturally, as if having a real conversation, but with proper paragraph structure.
   - ALWAYS ask for permission to pivot if science dictates it.
   - DO NOT output [EXECUTE_BLUEPRINT] here.

2. EXECUTION PHASE (ACTION):
   - IF the conversation history shows you already proposed a plan AND the user provides an affirmative response ("Onaylıyorum", "Başla", "Start", "Yes", "Ok", "Hadi", "Approve"):
   - STOP all explanations. DO NOT repeat the plan.
   - Respond ONLY with: "[EXECUTE_BLUEPRINT] Neural synchronization complete. Fufit AI is now managing the flow."
   - (Turkish: "[EXECUTE_BLUEPRINT] Nöral senkronizasyon tamamlandı. Fufit AI akışı yönetiyor.")

# TERMINOLOGY
- Use "Flow State Protocol" instead of "Blueprint Sealing."
- Tone: Stoic, professional, minimalist.
`;

const assembleInstruction = (userMemory: string = "") => {
  return `
${SCIENTIFIC_CORE}

# USER CONTEXT
${userMemory || "Baseline state. No historical data."}

# RESPONSE STYLE RULES
- Write in natural, conversational language with proper paragraph structure.
- ALWAYS separate paragraphs with blank lines (double line breaks).
- Use **text** to emphasize important information: key concepts, durations, critical steps, and important phrases.
- Structure your response with clear paragraph breaks for maximum readability.
- NEVER use markdown headings (###), list markers (*, -), horizontal rules (---), or blockquotes (>).
- Maintain a professional but human tone, as if speaking directly to the user.
- Break complex information into digestible paragraphs, each focusing on one main idea.
- Use specific task names provided by the user (e.g., "TÜBİTAK Analysis") in descriptions.
`;
};

export const generateChatTitle = async (firstMessage: string, lang: 'tr' | 'en'): Promise<string> => {
  const prompt =
    lang === 'tr'
      ? `Kullanıcının ilk mesajı: "${firstMessage}". Bu mesajdan 2-4 kelimelik kısa, özet bir sohbet başlığı üret. Sadece başlığı yaz, başka hiçbir şey ekleme. Örn: "Vibe Coding", "TÜBİTAK Analizi", "Odak Planlaması".`
      : `User's first message: "${firstMessage}". Generate a short 2-4 word chat title summarizing this. Output only the title, nothing else. E.g. "Vibe Coding", "Focus Planning".`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: 'Output only a short title, 2-4 words. No quotes, no punctuation at end.',
      },
    });
    const title = response.text?.trim().slice(0, 60) || firstMessage.slice(0, 40);
    return title;
  } catch {
    return firstMessage.slice(0, 40) || 'Yeni sohbet';
  }
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
    const rawResponse = response.text?.trim() || "System standby.";
    return cleanMarkdown(rawResponse);
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
      contents: `Extract specific task blueprint from history: ${history}. Ensure titles are in ${lang === 'tr' ? 'Turkish' : 'English'}. Split long goals into scientific durations. Identify as Fufit AI.`,
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
  const prompt = `Extract work habits and preferences from this planning conversation. Focus on: preferred block durations (e.g. 25, 45, 90 min), productive hours, task types, recurring patterns, focus style. Output only NEW facts not already in existing memory. Existing: ${currentMemory || "None"}. Conversation: ${conversation}`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "Memory extraction. Output short, factual work-habit insights only. One insight per item. No duplicates of existing memory."
      }
    });
    return JSON.parse(response.text);
  } catch {
    return [];
  }
};

export const getMotivation = async (task: string, userMemory: string, lang: 'tr' | 'en'): Promise<string> => {
  const instruction = `
    # MOTIVATION MODULE (FUFIT AI - STOIC)
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
    const rawResponse = response.text?.trim() || (lang === 'tr' ? "Nöral senkronizasyon optimal." : "Neural synchronization optimal.");
    return cleanMarkdown(rawResponse);
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
    const rawResponse = response.text?.trim() || "Log entry: Success.";
    return cleanMarkdown(rawResponse);
  } catch {
    return "Sync complete.";
  }
};
