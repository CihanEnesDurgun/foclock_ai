import { supabase } from './supabase';
import { getFriendIds } from './friendService';

/**
 * Birlikte Çalış (Pair Mode) - 2 kişi, herkes kendi timer'ını kullanır
 */

export async function startPairWith(userId: string, friendId: string): Promise<{ success: boolean; error?: string }> {
  const friendIds = await getFriendIds(userId);
  if (!friendIds.includes(friendId)) {
    return { success: false, error: 'not_friend' };
  }
  const [userA, userB] = userId < friendId ? [userId, friendId] : [friendId, userId];
  const { error } = await supabase.from('co_work_pairs').upsert(
    { user_a: userA, user_b: userB, started_at: new Date().toISOString() },
    { onConflict: 'user_a,user_b' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function endPairWith(userId: string, friendId: string): Promise<{ success: boolean }> {
  const [userA, userB] = userId < friendId ? [userId, friendId] : [friendId, userId];
  await supabase.from('co_work_pairs').delete().eq('user_a', userA).eq('user_b', userB);
  return { success: true };
}

export async function getPairedFriendId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('co_work_pairs')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.user_a === userId ? data.user_b : data.user_a;
}

export async function isPairedWith(userId: string, friendId: string): Promise<boolean> {
  const [userA, userB] = userId < friendId ? [userId, friendId] : [friendId, userId];
  const { data, error } = await supabase
    .from('co_work_pairs')
    .select('user_a')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .limit(1)
    .single();
  return !error && !!data;
}
