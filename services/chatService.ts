import { supabase } from './supabase';
import type { ChatMessage, PlannedTask, AIConversationListItem } from '../types';

export type { AIConversationListItem };

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  plannedTasks: PlannedTask[];
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

const DEFAULT_TITLE = 'Yeni sohbet';

export async function createConversation(userId: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title: DEFAULT_TITLE })
    .select('id')
    .single();

  if (error) return null;
  return { id: data.id };
}

export async function getConversations(userId: string): Promise<AIConversationListItem[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? DEFAULT_TITLE,
    updatedAt: r.updated_at,
  }));
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<AIConversation | null> {
  const { data: convData, error: convError } = await supabase
    .from('ai_conversations')
    .select('id, user_id, title, planned_tasks, created_at, updated_at')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (convError || !convData) return null;

  const { data: messagesData, error: msgError } = await supabase
    .from('ai_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgError) return null;

  const messages: ChatMessage[] = (messagesData ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: new Date(m.created_at).getTime(),
  }));

  const plannedTasks: PlannedTask[] = Array.isArray(convData.planned_tasks)
    ? convData.planned_tasks.map((t: { id: string; title: string; durations: number[]; completedBlocks: number; totalMinutes: number }) => ({
        id: t.id,
        title: t.title,
        durations: t.durations ?? [],
        completedBlocks: t.completedBlocks ?? 0,
        totalMinutes: t.totalMinutes ?? 0,
      }))
    : [];

  return {
    id: convData.id,
    userId: convData.user_id,
    title: convData.title ?? DEFAULT_TITLE,
    plannedTasks,
    createdAt: convData.created_at,
    updatedAt: convData.updated_at,
    messages,
  };
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select('id, role, content, created_at')
    .single();

  if (error) return null;

  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    role: data.role as 'user' | 'assistant',
    content: data.content,
    timestamp: new Date(data.created_at).getTime(),
  };
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ title: title.trim().slice(0, 80) || DEFAULT_TITLE, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return !error;
}

export async function updateConversationTasks(
  conversationId: string,
  tasks: PlannedTask[]
): Promise<boolean> {
  const { error } = await supabase
    .from('ai_conversations')
    .update({ planned_tasks: tasks, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return !error;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
  return !error;
}
