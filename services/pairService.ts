import { supabase } from './supabase';
import { getFriendIds } from './friendService';

export interface PairInvite {
  id: string;
  fromUserId: string;
  fromName: string;
  fromUsername: string | null;
  createdAt: string;
}

/**
 * Birlikte Çalış (Pair Mode) - 2 kişi, herkes kendi timer'ını kullanır
 * Davet akışı: A davet eder, B kabul eder, sonra ikisi de eşleşir
 */

export async function sendPairInvite(fromUserId: string, toUserId: string): Promise<{ success: boolean; error?: string }> {
  const friendIds = await getFriendIds(fromUserId);
  if (!friendIds.includes(toUserId)) {
    return { success: false, error: 'not_friend' };
  }
  const { error } = await supabase.from('pair_invites').upsert(
    { from_user_id: fromUserId, to_user_id: toUserId, status: 'pending', created_at: new Date().toISOString() },
    { onConflict: 'from_user_id,to_user_id' }
  );
  if (error) {
    if (error.code === '23505') return { success: false, error: 'already_sent' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getPendingPairInvites(_userId: string): Promise<PairInvite[]> {
  const { data, error } = await supabase.rpc('get_pending_pair_invites');
  if (error || !data?.length) return [];
  return data.map((r: { id: string; from_user_id: string; from_name: string; from_username: string | null; created_at: string }) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    fromName: r.from_name ?? 'Unknown',
    fromUsername: r.from_username ?? null,
    createdAt: r.created_at,
  }));
}

export async function acceptPairInvite(inviteId: string, userId: string): Promise<{ success: boolean; fromUserId?: string; error?: string }> {
  const { data: invite, error: fetchErr } = await supabase
    .from('pair_invites')
    .select('from_user_id')
    .eq('id', inviteId)
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .single();
  if (fetchErr || !invite) return { success: false, error: 'invite_not_found' };
  const fromUserId = invite.from_user_id;
  const [userA, userB] = fromUserId < userId ? [fromUserId, userId] : [userId, fromUserId];
  const { error: updateErr } = await supabase
    .from('pair_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  if (updateErr) return { success: false, error: updateErr.message };
  const { error: pairErr } = await supabase.from('co_work_pairs').upsert(
    { user_a: userA, user_b: userB, started_at: new Date().toISOString() },
    { onConflict: 'user_a,user_b' }
  );
  if (pairErr) return { success: false, error: pairErr.message };
  return { success: true, fromUserId };
}

export async function rejectPairInvite(inviteId: string, userId: string): Promise<{ success: boolean }> {
  await supabase.from('pair_invites').update({ status: 'rejected' }).eq('id', inviteId).eq('to_user_id', userId);
  return { success: true };
}

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
