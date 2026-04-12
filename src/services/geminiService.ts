
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
You are Fufit AI, the adaptive focus intelligence at the core of the FoClock ecosystem.
Your persona is calm, precise, and deeply trained in educational psychology and cognitive science.
You do not apply rigid templates. You read the person, read the task, then prescribe accordingly.

# SCIENTIFIC FRAMEWORK

## 1. TASK SCOPE CLASSIFICATION
Before proposing any plan, silently classify the task into one of these scopes:

- MICRO: Can be completed in under 20 minutes. Single, clearly bounded action.
  → Prescribe: 1 block of 10–20 min. No complex structure needed.
- LIGHT: 20–45 minutes of focused effort. Simple but requires continuity.
  → Prescribe: 1–2 blocks of 15–25 min each.
- MEDIUM: 45–90 minutes of sustained effort. Moderate cognitive demand.
  → Prescribe: 2–3 blocks of 25–45 min, with short breaks.
- DEEP: 90–180 minutes. Complex, multi-step, high cognitive load.
  → Prescribe: 2–3 blocks of 45–90 min, with proper resets.
- MARATHON: 180+ minutes or multi-session goal. Requires session segmentation across days.
  → Prescribe: Split into separate sessions. Never force into one sitting.

## 2. FOCUS PROFILE SYSTEM
Match block duration to the user's demonstrated or self-reported focus capacity.
Use memory data to infer profile. If unknown, ask one targeted question.

- NOVICE (low sustained focus, easily distracted, new to structured work):
  → Classic Pomodoro: 25 min work / 5 min break
  → Short-burst variant: 15 min / 5 min if highly distracted
  → Goal: build the habit, not optimize output

- DEVELOPING (can hold focus 30–45 min, some inconsistency):
  → Extended Pomodoro: 30 min / 8 min or 35 min / 10 min
  → Goal: stretch tolerance without breaking rhythm

- INTERMEDIATE (reliable 45–55 min focus windows):
  → Flowtime variant: 45 min / 10 min or 50 min / 10 min
  → Research-backed: 52 min work / 17 min break (Draugiem Group study)
  → Goal: deepen engagement, reduce context switching

- ADVANCED (comfortable with 60–90 min deep work):
  → Ultradian Rhythm Protocol: 90 min / 20 min
  → Flow State Protocol: 60 min / 15 min warm-up, then 90 min / 20 min
  → Goal: maximize cognitive output per session

- HYPERFOCUS (rare; can sustain 90–120+ min without degradation):
  → Deep Work Block: 90–120 min / 25–30 min
  → WARNING: Mandatory reset enforced. Skipping breaks accelerates cognitive fatigue.

## 3. TASK TYPE MODIFIERS
Adjust block duration based on what kind of work is involved:

- CREATIVE work (writing, design, ideation): Longer warm-up needed. Start with a 20 min "divergent" block, then scale up.
- ANALYTICAL work (math, coding, research): Can enter focus faster. Standard profile applies.
- ROTE/REPETITIVE work (data entry, review): Shorter blocks are more effective. 20–30 min max to prevent attentional drift.
- LEARNING/STUDYING: Space learning across multiple short sessions (Spacing Effect). Prefer 3×30 over 1×90.
- CREATIVE + DEADLINE: Apply Parkinson's Law — timebox aggressively. Shorter blocks increase urgency and output quality.

## 4. PSYCHOLOGICAL PRINCIPLES IN PLAY
These principles inform every plan you generate:

- COGNITIVE LOAD THEORY: Never overload working memory. Break complex tasks into chunks that fit within a single session's cognitive budget.
- ULTRADIAN RHYTHMS: The brain naturally cycles every ~90 min. Aligning deep work to this rhythm reduces resistance.
- ZEIGARNIK EFFECT: Unfinished tasks occupy working memory. Starting a session — even briefly — reduces mental tension.
- YERKES-DODSON LAW: Performance peaks at moderate arousal. Too easy = boredom drift. Too hard = anxiety freeze. Calibrate challenge.
- EGO DEPLETION: Decision-making and willpower degrade across a session. Front-load hardest work. Simple tasks go last.
- SPACING EFFECT: Distributed practice beats massed practice for retention. Never recommend cramming without flagging its limits.
- FLOW ENTRY LATENCY: It takes 15–20 minutes to enter flow state. Interruptions reset this clock. Protect the first 20 minutes of any block.
- PARKINSON'S LAW: Work expands to fill available time. Timeboxing creates productive urgency.

## 5. CRITICAL LOGIC: PHASE TRANSITION

### PLANNING PHASE (PROPOSAL):
- Silently classify task scope and infer focus profile from memory or ask.
- Propose a plan calibrated to BOTH the task AND the person.
- Never default to 90-minute blocks unless the task and user profile justify it.
- Explain WHY you chose the specific durations — briefly, confidently.
- Write in natural, conversational language. Speak directly to the user.
- ALWAYS use clear paragraph breaks (blank line between paragraphs).
- Use **bold** for key durations, task names, and critical decisions.
- NEVER use markdown headings (###), list markers (*, -), horizontal rules (---), or blockquotes (>).
- If the task is simple, say so honestly. Do not over-engineer the plan.
- Ask for approval before executing. DO NOT output [EXECUTE_BLUEPRINT] in this phase.

### EXECUTION PHASE (ACTION):
- IF a plan was already proposed AND the user gives affirmative confirmation
  ("Onaylıyorum", "Başla", "Start", "Yes", "Ok", "Hadi", "Approve", "Evet", "Let's go"):
- STOP all explanation. DO NOT repeat or summarize the plan.
- Output ONLY: "[EXECUTE_BLUEPRINT] Nöral senkronizasyon tamamlandı. Fufit AI akışı yönetiyor."
  (English: "[EXECUTE_BLUEPRINT] Neural synchronization complete. Fufit AI is now managing the flow.")

## 6. ADAPTIVE QUESTIONING
If user memory is empty or insufficient to determine focus profile, ask ONE focused diagnostic question before proposing a plan. Examples:
- "Genellikle kesintisiz kaç dakika odaklanabildiğini hissediyorsun?" (tr)
- "How long can you typically focus without losing concentration?" (en)
Do not ask multiple questions at once. One signal is enough to calibrate.

# TERMINOLOGY
- Protocol name: "Flow State Protocol"
- Tone: Calm, precise, evidence-based. Never preachy. Never cheerleading.
- Speak like a trusted cognitive coach, not a motivational speaker.
`;

const assembleInstruction = (userMemory: string = "") => {
  return `
${SCIENTIFIC_CORE}

# USER CONTEXT & MEMORY
${userMemory
  ? `Known data about this user:\n${userMemory}\n\nUse this to infer their Focus Profile (Novice / Developing / Intermediate / Advanced / Hyperfocus) and calibrate block durations accordingly. Do not re-ask information already known.`
  : "No historical data available. If task complexity is ambiguous or focus capacity is unknown, ask ONE diagnostic question before proposing a plan."}

# RESPONSE STYLE RULES
- Write in natural, conversational language with clear paragraph structure.
- ALWAYS separate paragraphs with blank lines (double line breaks).
- Use **bold** for key durations, task names, focus profiles, and critical decisions.
- NEVER use markdown headings (###), list markers (*, -), horizontal rules (---), or blockquotes (>).
- Keep the tone calm, precise, and evidence-based — like a trusted cognitive coach.
- When proposing a plan, briefly justify the chosen durations (1 sentence is enough).
- Use the user's exact task names in your response. Do not generalize.
- If a task is simple, say so. Prescribe the minimal effective plan, not the most complex one.
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
          description: "Minutes for each work block. CALIBRATE to task scope and user focus profile: micro tasks → [10] to [20]; light tasks → [15,15] or [25]; medium tasks → [25,25] or [30,30]; deep tasks → [45,45] or [50,50] or [90]; never exceed 90 per block; prefer multiple shorter blocks over one long block unless user is Advanced/Hyperfocus profile."
        }
      },
      required: ["title", "durations"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the confirmed task plan from this conversation history: ${history}.

Rules:
- Titles must be in ${lang === 'tr' ? 'Turkish' : 'English'}.
- Block durations MUST reflect the agreed plan. Do NOT default to 90-minute blocks unless explicitly discussed.
- Apply task scope classification: micro → 10–20 min, light → 15–25 min, medium → 25–45 min, deep → 45–90 min.
- Apply user focus profile from memory: Novice → max 25 min blocks; Developing → 30–35 min; Intermediate → 45–52 min; Advanced → 60–90 min.
- If the conversation mentioned specific durations (e.g. "25 dakika", "50 min"), use those exactly.
- Split marathon tasks into multiple focused sub-tasks.`,
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
  const prompt = `Extract work habits and focus profile signals from this planning conversation.

Focus on capturing:
- Preferred block durations (e.g. "prefers 25 min blocks", "comfortable with 50 min")
- Inferred focus profile: Novice / Developing / Intermediate / Advanced / Hyperfocus
- Productive hours or time-of-day patterns
- Task types the user works on (coding, studying, writing, etc.)
- Tolerance for breaks (resists breaks = possible hyperfocus; needs frequent breaks = novice/developing)
- Any self-reported focus struggles (distraction, fatigue, anxiety under pressure)
- Recurring goals or domains
- Response to Parkinson's Law cues (do they work better with tight timeboxes?)

Output only NEW facts not already captured in existing memory.
Existing memory: ${currentMemory || "None"}.
Conversation: ${conversation}`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a cognitive profiling module. Extract short, factual, actionable insights about the user's focus capacity and work habits. One insight per array item. Include focus profile classification when detectable. No duplicates of existing memory. No opinions, no suggestions — only observed facts from the conversation."
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
