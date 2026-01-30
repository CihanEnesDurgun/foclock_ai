import { supabase } from './supabase';
import type { Room, RoomMemberInfo, RoomSessionState } from '../types';
import { getFriendIds } from './friendService';

const ROOM_MAX_MEMBERS = 15;

/**
 * Odalar - max 15 kişi, ortak timer, ortak görev
 * Davet: oda kodu + arkadaş listesinden
 */

export async function createRoom(
  hostId: string,
  title: string,
  durationMinutes: number = 25
): Promise<{ success: boolean; room?: Room; error?: string }> {
  const { data: codeData, error: codeError } = await supabase.rpc('generate_room_code');
  if (codeError || !codeData) {
    return { success: false, error: 'Oda kodu oluşturulamadı.' };
  }
  const roomCode = codeData as string;

  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .insert({
      host_id: hostId,
      title: title.trim() || 'Ortak Çalışma',
      room_code: roomCode,
      duration_minutes: durationMinutes,
      max_members: ROOM_MAX_MEMBERS,
    })
    .select('id, host_id, title, room_code, duration_minutes, max_members, created_at')
    .single();

  if (roomError) return { success: false, error: roomError.message };

  await supabase.from('room_members').insert({
    room_id: roomData.id,
    user_id: hostId,
    role: 'host',
  });

  const room: Room = {
    id: roomData.id,
    hostId: roomData.host_id,
    title: roomData.title,
    roomCode: roomData.room_code,
    durationMinutes: roomData.duration_minutes,
    maxMembers: roomData.max_members,
    createdAt: roomData.created_at,
  };
  return { success: true, room };
}

export async function joinRoomByCode(
  userId: string,
  roomCode: string
): Promise<{ success: boolean; room?: Room; error?: string }> {
  const code = roomCode.trim().toUpperCase();
  if (!code || code.length < 4) {
    return { success: false, error: 'Geçersiz oda kodu.' };
  }

  const { data: roomId, error } = await supabase.rpc('join_room_by_code', { p_room_code: code });
  if (error) return { success: false, error: error.message };
  if (!roomId) return { success: false, error: 'Oda bulunamadı veya dolu.' };

  const room = await getRoom(userId, roomId);
  if (!room) return { success: false, error: 'Oda bilgisi alınamadı.' };
  return { success: true, room };
}

export async function inviteFriendToRoom(
  roomId: string,
  hostId: string,
  friendId: string
): Promise<{ success: boolean; error?: string }> {
  const friendIds = await getFriendIds(hostId);
  if (!friendIds.includes(friendId)) {
    return { success: false, error: 'Arkadaş değil.' };
  }

  const { data: room } = await supabase.from('rooms').select('host_id, max_members').eq('id', roomId).single();
  if (!room || room.host_id !== hostId) {
    return { success: false, error: 'Yetkisiz.' };
  }

  const { count } = await supabase
    .from('room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);
  if ((count ?? 0) >= room.max_members) {
    return { success: false, error: 'Oda dolu.' };
  }

  const { error } = await supabase.from('room_members').upsert(
    { room_id: roomId, user_id: friendId, role: 'member' },
    { onConflict: 'room_id,user_id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getRoom(userId: string, roomId: string): Promise<Room | null> {
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id, title, room_code, duration_minutes, max_members, created_at')
    .eq('id', roomId)
    .single();

  if (roomError || !roomData) return null;

  const isMember = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();
  if (isMember.error || !isMember.data) return null;

  const { data: membersData } = await supabase.rpc('get_room_members_with_profiles', {
    p_room_id: roomId,
  });
  const members: RoomMemberInfo[] = (membersData ?? []).map((m: { user_id: string; name: string; username: string | null; role: string; joined_at: string }) => ({
    userId: m.user_id,
    name: m.name ?? 'Unknown',
    username: m.username ?? null,
    role: m.role as 'host' | 'member',
    joinedAt: m.joined_at,
  }));

  const { data: sessionData } = await supabase
    .from('room_sessions')
    .select('task_title, duration_minutes, time_remaining_seconds, status, started_at, updated_at')
    .eq('room_id', roomId)
    .single();

  let activeSession: RoomSessionState | undefined;
  if (sessionData) {
    activeSession = {
      taskTitle: sessionData.task_title,
      durationMinutes: sessionData.duration_minutes,
      timeRemainingSeconds: sessionData.time_remaining_seconds,
      status: sessionData.status as 'running' | 'paused',
      startedAt: sessionData.started_at,
      updatedAt: sessionData.updated_at,
    };
  }

  return {
    id: roomData.id,
    hostId: roomData.host_id,
    title: roomData.title,
    roomCode: roomData.room_code,
    durationMinutes: roomData.duration_minutes,
    maxMembers: roomData.max_members,
    createdAt: roomData.created_at,
    members,
    activeSession,
  };
}

export async function getMyRooms(userId: string): Promise<Room[]> {
  const { data: memberships } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (!memberships || memberships.length === 0) return [];

  const rooms: Room[] = [];
  for (const m of memberships) {
    const room = await getRoom(userId, m.room_id);
    if (room) rooms.push(room);
  }
  rooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rooms;
}

export async function leaveRoom(userId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
  const { data: room } = await supabase.from('rooms').select('host_id').eq('id', roomId).single();
  if (!room) return { success: false, error: 'Oda bulunamadı.' };
  if (room.host_id === userId) {
    await supabase.from('rooms').delete().eq('id', roomId);
    return { success: true };
  }
  const { error } = await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function startRoomSession(
  roomId: string,
  hostId: string,
  taskTitle: string,
  durationMinutes: number
): Promise<{ success: boolean; error?: string }> {
  const { data: room } = await supabase.from('rooms').select('host_id').eq('id', roomId).single();
  if (!room || room.host_id !== hostId) return { success: false, error: 'Yetkisiz.' };

  const timeRemaining = durationMinutes * 60;
  const { error } = await supabase.from('room_sessions').upsert(
    {
      room_id: roomId,
      task_title: taskTitle,
      duration_minutes: durationMinutes,
      time_remaining_seconds: timeRemaining,
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateRoomSession(
  roomId: string,
  hostId: string,
  timeRemainingSeconds: number,
  status: 'running' | 'paused'
): Promise<{ success: boolean }> {
  const { data: room } = await supabase.from('rooms').select('host_id').eq('id', roomId).single();
  if (!room || room.host_id !== hostId) return { success: false };

  await supabase
    .from('room_sessions')
    .update({
      time_remaining_seconds: timeRemainingSeconds,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId);
  return { success: true };
}

export async function completeRoomSession(roomId: string, hostId: string): Promise<{ success: boolean }> {
  const { data: room } = await supabase.from('rooms').select('host_id').eq('id', roomId).single();
  if (!room || room.host_id !== hostId) return { success: false };

  const { data: session } = await supabase
    .from('room_sessions')
    .select('task_title, duration_minutes')
    .eq('room_id', roomId)
    .single();

  if (session) {
    const { data: members } = await supabase.from('room_members').select('user_id').eq('room_id', roomId);
    for (const m of members ?? []) {
      await supabase.from('sessions').insert({
        user_id: m.user_id,
        task_title: session.task_title,
        duration_minutes: session.duration_minutes,
      });
    }
  }

  await supabase.from('room_sessions').delete().eq('room_id', roomId);
  return { success: true };
}

export async function clearRoomSession(roomId: string): Promise<void> {
  await supabase.from('room_sessions').delete().eq('room_id', roomId);
}
