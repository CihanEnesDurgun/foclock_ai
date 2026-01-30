
export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum TimerMode {
  FOCUS = 'FOCUS',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK'
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  field: string;
  projectTags: string[];
  role: 'admin' | 'user';
  friends: string[]; // List of user IDs
  pendingRequests: string[]; // List of user IDs who sent requests
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'tr' | 'en';
    notifications: boolean;
  };
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_user?: { id: string; username: string; name: string };
}

export interface PomodoroSession {
  id: string;
  task: string;
  startTime: string; 
  endTime: string;   
  durationMinutes: number;
  breakMinutes: number;
  syncedToCalendar: boolean;
  status: 'planned' | 'success';
  focusScore?: number; 
}

export interface PlannedTask {
  id: string;
  title: string;
  durations: number[]; 
  completedBlocks: number;
  totalMinutes: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface FriendActivity {
  id: string;
  name: string;
  status: 'flow' | 'rest' | 'idle';
  activity: string;
  timeRemaining: number;
  totalDuration: number;
  lastSeen?: string;
  pairedWith?: string; // user id - birlikte çalışıyor
}

// Birlikte Çalış (2 kişi, herkes kendi timer'ı)
export interface CoWorkPair {
  userA: string;
  userB: string;
  startedAt: string;
}

// Oda (max 15 kişi, ortak timer)
export interface Room {
  id: string;
  hostId: string;
  title: string;
  roomCode: string;
  durationMinutes: number;
  maxMembers: number;
  createdAt: string;
  members?: RoomMemberInfo[];
  activeSession?: RoomSessionState;
}

export interface RoomMemberInfo {
  userId: string;
  name: string;
  username: string | null;
  role: 'host' | 'member';
  joinedAt: string;
}

export interface RoomSessionState {
  taskTitle: string;
  durationMinutes: number;
  timeRemainingSeconds: number;
  status: 'running' | 'paused';
  startedAt: string;
  updatedAt: string;
}
