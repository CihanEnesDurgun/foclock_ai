import { supabase } from './supabase';

const MAX_INSIGHTS_FOR_PROMPT = 20;

/**
 * Kullanıcının AI belleğinden son N insight'ı getirir.
 * Planlama prompt'unda USER CONTEXT olarak kullanılır.
 */
export async function getInsightsForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_ai_memory')
    .select('insight')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_INSIGHTS_FOR_PROMPT);

  if (error) return [];
  return (data ?? []).map((r) => r.insight).filter(Boolean);
}

/**
 * Yeni insight'ları kullanıcı belleğine ekler.
 * extractNewInsights sonrası çağrılır.
 */
export async function addInsights(
  userId: string,
  insights: string[],
  source: 'conversation' | 'session' | 'manual' = 'conversation'
): Promise<void> {
  if (insights.length === 0) return;

  const rows = insights
    .map((insight) => insight?.trim())
    .filter((s) => s.length > 0)
    .map((insight) => ({ user_id: userId, insight, source }));

  if (rows.length === 0) return;

  await supabase.from('user_ai_memory').insert(rows);
}

/**
 * Profil bilgisi + öğrenilmiş alışkanlıklardan zengin USER CONTEXT string'i oluşturur.
 */
export function buildUserContext(
  name: string,
  field: string,
  projectTags: string[],
  learnedInsights: string[]
): string {
  const parts: string[] = [];

  parts.push(`Name: ${name || 'User'}`);
  parts.push(`Field: ${field || 'General'}`);

  if (projectTags?.length) {
    parts.push(`Project tags: ${projectTags.join(', ')}`);
  }

  if (learnedInsights?.length) {
    parts.push('');
    parts.push('Learned preferences and habits:');
    learnedInsights.forEach((i) => parts.push(`- ${i}`));
  }

  return parts.join('\n');
}
