import type { FriendActivity } from '../types';

/**
 * Friend Activity API.
 * Fetches friends' current focus (active session) or last completed session.
 * Replace mock implementation with Supabase once friendships + active_sessions exist.
 */

function mockActivities(lang: 'tr' | 'en'): FriendActivity[] {
  const t = lang === 'tr';
  return [
    {
      id: 'fa1',
      name: 'Ayşe K.',
      status: 'flow',
      activity: t ? 'React raporu' : 'React report',
      timeRemaining: 13 * 60,
      totalDuration: 25 * 60,
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'fa2',
      name: 'Mehmet Y.',
      status: 'idle',
      activity: t ? 'Ders çalışma' : 'Study session',
      timeRemaining: 0,
      totalDuration: 25 * 60,
      lastSeen: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'fa3',
      name: 'Zeynep A.',
      status: 'flow',
      activity: t ? 'Sunum hazırlığı' : 'Presentation prep',
      timeRemaining: 7 * 60,
      totalDuration: 25 * 60,
      lastSeen: new Date().toISOString(),
    },
  ];
}

export async function getFriendActivities(
  _userId: string,
  lang: 'tr' | 'en'
): Promise<FriendActivity[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400));
  return mockActivities(lang);
}
