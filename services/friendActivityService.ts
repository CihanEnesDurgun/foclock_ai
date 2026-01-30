import type { FriendActivity } from '../types';
import { supabase } from './supabase';
import { getFriendIds } from './friendService';

/**
 * Friend Activity API.
 * Fetches friends' active sessions and last completed sessions from Supabase.
 */

export async function getFriendActivities(
  userId: string,
  lang: 'tr' | 'en'
): Promise<FriendActivity[]> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  // Get friends' profiles using RPC to bypass RLS
  const { data: profiles, error: profilesError } = await supabase.rpc('get_friends');

  if (profilesError || !profiles || profiles.length === 0) {
    console.warn('getFriendActivities get_friends RPC error:', profilesError);
    return [];
  }

  // Get active sessions for friends (running veya paused)
  const { data: activeSessions, error: activeError } = await supabase
    .from('active_sessions')
    .select('user_id, task_title, duration_minutes, time_remaining_seconds, status, updated_at, paired_with_user_id')
    .in('user_id', friendIds)
    .or('status.eq.running,status.eq.paused');

  if (activeError) {
    console.warn('getFriendActivities active_sessions error:', activeError);
  }

  // Get last completed session for each friend (for idle friends)
  const { data: completedSessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('user_id, task_title, duration_minutes, completed_at')
    .in('user_id', friendIds)
    .order('completed_at', { ascending: false });

  if (sessionsError) {
    console.warn('getFriendActivities sessions error:', sessionsError);
  }

  // Map to activities
  const activities: FriendActivity[] = [];
  const activeMap = new Map<string, typeof activeSessions[0]>();
  const completedMap = new Map<string, typeof completedSessions[0]>();

  // Build maps
  for (const active of activeSessions ?? []) {
    activeMap.set(active.user_id, active);
  }
  for (const completed of completedSessions ?? []) {
    if (!completedMap.has(completed.user_id)) {
      completedMap.set(completed.user_id, completed);
    }
  }

  for (const profile of profiles) {
    const active = activeMap.get(profile.id);
    const completed = completedMap.get(profile.id);

    if (active) {
      // Friend has active session (running veya paused)
      activities.push({
        id: profile.id,
        name: profile.name,
        status: active.status === 'running' ? 'flow' : active.status === 'paused' ? 'paused' : 'idle',
        activity: active.task_title || '',
        timeRemaining: active.time_remaining_seconds,
        totalDuration: active.duration_minutes * 60,
        lastSeen: active.updated_at ? new Date(active.updated_at).toISOString() : undefined,
        pairedWith: active.paired_with_user_id ?? undefined,
      });
    } else if (completed) {
      // Friend has completed session but no active one
      const completedAt = new Date(completed.completed_at);
      const minutesSinceCompletion = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60));
      
      activities.push({
        id: profile.id,
        name: profile.name,
        status: 'idle',
        activity: completed.task_title || '',
        timeRemaining: 0,
        totalDuration: completed.duration_minutes * 60,
        lastSeen: completedAt.toISOString(),
      });
    } else {
      // No activity at all
      activities.push({
        id: profile.id,
        name: profile.name,
        status: 'idle',
        activity: '',
        timeRemaining: 0,
        totalDuration: 0,
        lastSeen: undefined,
      });
    }
  }

  // Sort: flow first, then paused, then by last seen
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
