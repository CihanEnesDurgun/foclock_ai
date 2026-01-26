import type { FriendActivity } from '../types';
import { supabase } from './supabase';
import { getFriendIds } from './friendService';

/**
 * Friend Activity API.
 * Fetches friends' last completed sessions from Supabase.
 * Note: Active session tracking requires an active_sessions table (future enhancement).
 */

export async function getFriendActivities(
  userId: string,
  lang: 'tr' | 'en'
): Promise<FriendActivity[]> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  // Get friends' profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, username')
    .in('id', friendIds);

  if (profilesError || !profiles || profiles.length === 0) return [];

  // Get last session for each friend
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('user_id, task_title, duration_minutes, completed_at')
    .in('user_id', friendIds)
    .order('completed_at', { ascending: false });

  if (sessionsError) {
    console.warn('getFriendActivities sessions error:', sessionsError);
    return [];
  }

  // Map sessions to friend activities
  const activities: FriendActivity[] = [];
  const sessionMap = new Map<string, typeof sessions[0]>();
  
  // Get most recent session per friend
  for (const session of sessions ?? []) {
    if (!sessionMap.has(session.user_id)) {
      sessionMap.set(session.user_id, session);
    }
  }

  for (const profile of profiles) {
    const session = sessionMap.get(profile.id);
    const lastSeen = session?.completed_at 
      ? new Date(session.completed_at).toISOString()
      : undefined;
    
    // If no session, show as idle
    if (!session) {
      activities.push({
        id: profile.id,
        name: profile.name,
        status: 'idle',
        activity: '',
        timeRemaining: 0,
        totalDuration: 0,
        lastSeen,
      });
      continue;
    }

    // Calculate time since completion
    const completedAt = new Date(session.completed_at);
    const minutesSinceCompletion = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60));
    
    // If completed within last 5 minutes, show as "flow" (recently active)
    // Otherwise show as "idle"
    const status = minutesSinceCompletion < 5 ? 'flow' : 'idle';
    const totalDuration = session.duration_minutes * 60;
    const timeRemaining = status === 'flow' ? Math.max(0, totalDuration - (minutesSinceCompletion * 60)) : 0;

    activities.push({
      id: profile.id,
      name: profile.name,
      status,
      activity: session.task_title || '',
      timeRemaining,
      totalDuration,
      lastSeen,
    });
  }

  // Sort by last seen (most recent first)
  activities.sort((a, b) => {
    if (!a.lastSeen) return 1;
    if (!b.lastSeen) return -1;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return activities;
}
