import { supabase } from './supabase';
import type { FriendRequest } from '../types';

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function validateUsername(u: string): { ok: boolean; error?: string } {
  const t = u.trim();
  if (t.length < USERNAME_MIN) return { ok: false, error: 'username_too_short' };
  if (t.length > USERNAME_MAX) return { ok: false, error: 'username_too_long' };
  if (!USERNAME_REGEX.test(t)) return { ok: false, error: 'username_invalid' };
  return { ok: true };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { ok } = validateUsername(username);
  if (!ok) return false;
  const { data, error } = await supabase.rpc('check_username_available', {
    u: username.trim(),
  });
  if (error) {
    console.warn('check_username_available', error);
    return false;
  }
  return data === true;
}

export interface SearchUser {
  id: string;
  username: string | null;
  name: string;
}

export async function searchByUsername(query: string): Promise<SearchUser[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_users_by_username', { query: q });
  if (error) {
    console.warn('search_users_by_username', error);
    return [];
  }
  return (data ?? []).map((r: { id: string; username: string | null; name: string }) => ({
    id: r.id,
    username: r.username,
    name: r.name,
  }));
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (fromUserId === toUserId) return { success: false, error: 'self_request' };
  const { error } = await supabase.from('friend_requests').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505') return { success: false, error: 'already_sent' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getIncomingFriendRequests(_userId: string): Promise<FriendRequest[]> {
  const { data: rows, error } = await supabase.rpc('get_incoming_friend_requests');
  if (error) return [];
  return (rows ?? []).map((r: {
    id: string; from_user_id: string; to_user_id: string; status: string; created_at: string;
    from_username: string | null; from_name: string;
  }) => ({
    id: r.id,
    from_user_id: r.from_user_id,
    to_user_id: r.to_user_id,
    status: r.status as 'pending' | 'accepted' | 'rejected',
    created_at: r.created_at,
    from_user: { id: r.from_user_id, username: r.from_username ?? '', name: r.from_name },
  }));
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('to_user_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function rejectFriendRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('to_user_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

  if (error) return [];
  const ids: string[] = [];
  for (const r of data ?? []) {
    const other = r.from_user_id === userId ? r.to_user_id : r.from_user_id;
    if (other) ids.push(other);
  }
  return ids;
}
