import type { FriendActivity } from '../types';
import { supabase } from './supabase';
import { getFriendIds } from './friendService';

/** Aktif = son görülme bu süre içindeyse (ms) */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 dakika

/**
 * Friend Activity API.
 * Aktiflik = sisteme bağlı olmak (last_seen_at). Oturum açık olmasa da giriş yapmış kullanıcı "aktif" görünür.
 * lastSeen her zaman profile.last_seen_at'ten gelir (son görülme).
 */

type FriendProfile = { id: string; username: string | null; name: string; last_seen_at: string | null };

export async function getFriendActivities(
  userId: string,
  _lang: 'tr' | 'en'
): Promise<FriendActivity[]> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase.rpc('get_friends') as { data: FriendProfile[] | null; error: unknown };

  if (profilesError || !profiles || profiles.length === 0) {
    console.warn('getFriendActivities get_friends RPC error:', profilesError);
    return [];
  }

  const { data: activeSessions, error: activeError } = await supabase
    .from('active_sessions')
    .select('user_id, task_title, duration_minutes, time_remaining_seconds, status, updated_at, paired_with_user_id')
    .in('user_id', friendIds)
    .or('status.eq.running,status.eq.paused');

  if (activeError) console.warn('getFriendActivities active_sessions error:', activeError);

  const { data: completedSessions } = await supabase
    .from('sessions')
    .select('user_id, task_title, duration_minutes, completed_at')
    .in('user_id', friendIds)
    .order('completed_at', { ascending: false });

  const activeMap = new Map((activeSessions ?? []).map((a) => [a.user_id, a]));
  const completedMap = new Map<string, (typeof completedSessions)[0]>();
  for (const c of completedSessions ?? []) {
    if (!completedMap.has(c.user_id)) completedMap.set(c.user_id, c);
  }

  const activities: FriendActivity[] = [];

  for (const profile of profiles) {
    const active = activeMap.get(profile.id);
    const completed = completedMap.get(profile.id);
    // Son görülme her zaman profilden (sisteme bağlanma / heartbeat)
    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at).toISOString() : undefined;

    if (active) {
      activities.push({
        id: profile.id,
        name: profile.name,
        status: active.status === 'running' ? 'flow' : active.status === 'paused' ? 'paused' : 'idle',
        activity: active.task_title || '',
        timeRemaining: active.time_remaining_seconds,
        totalDuration: active.duration_minutes * 60,
        lastSeen,
        pairedWith: active.paired_with_user_id ?? undefined,
      });
    } else if (completed) {
      activities.push({
        id: profile.id,
        name: profile.name,
        status: 'idle',
        activity: completed.task_title || '',
        timeRemaining: 0,
        totalDuration: completed.duration_minutes * 60,
        lastSeen,
      });
    } else {
      activities.push({
        id: profile.id,
        name: profile.name,
        status: 'idle',
        activity: '',
        timeRemaining: 0,
        totalDuration: 0,
        lastSeen,
      });
    }
  }

  // Sıra: flow > paused > son görülme (en yeni önce)
  activities.sort((a, b) => {
    if (a.status === 'flow' && b.status !== 'flow') return -1;
    if (a.status !== 'flow' && b.status === 'flow') return 1;
    if (a.status === 'paused' && b.status !== 'paused') return -1;
    if (a.status !== 'paused' && b.status === 'paused') return 1;
    if (!a.lastSeen) return 1;
    if (!b.lastSeen) return -1;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return activities;
}

export { ONLINE_THRESHOLD_MS };
