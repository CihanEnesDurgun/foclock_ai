
import React, { useState, useEffect, useRef } from 'react';
import { TimerStatus, PomodoroSession, PlannedTask, TimerMode, ChatMessage, User, FriendActivity, FriendRequest, Room } from './types';
import { suggestPlan, finalizeTasks, getMotivation, summarizeSession, formatMessage, generateChatTitle } from './services/geminiService';
import { authService } from './services/authService';
import { getFriendActivities } from './services/friendActivityService';
import {
  checkUsernameAvailable,
  validateUsername,
  searchByUsername,
  sendFriendRequest,
  getIncomingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getFriendIds,
  type SearchUser,
  type Friend,
} from './services/friendService';
import { sendPairInvite, getPendingPairInvites, acceptPairInvite, rejectPairInvite, endPairWith, getPairedFriendId, type PairInvite } from './services/pairService';
import {
  createRoom,
  joinRoomByCode,
  getMyRooms,
  getRoom,
  leaveRoom,
  inviteFriendToRoom,
  startRoomSession,
  updateRoomSession,
  completeRoomSession,
} from './services/roomService';
import {
  createConversation,
  getConversations,
  getConversation,
  addMessage,
  updateConversationTitle,
  updateConversationTasks,
  type AIConversationListItem,
} from './services/chatService';
import { locales } from './locales';
import { getQuote, quoteCount, ROTATION_INTERVAL_MS } from './quotes';
import { VERSION } from './version';

const DEMO_USER_ID = 'demo-user-id';
const demoUser: User = {
  id: DEMO_USER_ID,
  name: 'Demo Kullanıcı',
  username: 'demo',
  email: 'demo@foclock.local',
  field: 'Yazılım',
  projectTags: [],
  role: 'user',
  friends: [],
  pendingRequests: [],
  preferences: { theme: 'dark', language: 'tr', notifications: true }
};

const App: React.FC = () => {
  const [view, setView] = useState<'splash' | 'welcome' | 'auth' | 'home'>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [sidebarModule, setSidebarModule] = useState<'default' | 'analytics' | 'settings' | 'social' | 'account' | 'rooms'>('default');
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [testMode, setTestMode] = useState(false); // 1 dakika = 1 saniye
  const [timeLeft, setTimeLeft] = useState(1500);
  const [sessionDuration, setSessionDuration] = useState(1500);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('');
  const [stats, setStats] = useState<any[]>([]);
  
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatHistoryPanelOpen, setChatHistoryPanelOpen] = useState(false);
  const [chatConversations, setChatConversations] = useState<AIConversationListItem[]>([]);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountSearchResults, setAccountSearchResults] = useState<SearchUser[]>([]);
  const [accountSearching, setAccountSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriendsList, setLoadingFriendsList] = useState(false);
  const [pairedWithUserId, setPairedWithUserId] = useState<string | null>(null);
  const [pairedFriendActivity, setPairedFriendActivity] = useState<FriendActivity | null>(null);
  const [pendingPairInvites, setPendingPairInvites] = useState<PairInvite[]>([]);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomJoinCode, setRoomJoinCode] = useState('');
  const [roomCreateTitle, setRoomCreateTitle] = useState('');
  const [roomCreateDuration, setRoomCreateDuration] = useState(25);
  const [roomTaskTitle, setRoomTaskTitle] = useState('');
  const [roomSessionTimeLeft, setRoomSessionTimeLeft] = useState(0);
  const [roomSessionDuration, setRoomSessionDuration] = useState(0);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [roomCreating, setRoomCreating] = useState(false);
  const roomTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const t = locales[lang];

  // Ses efektleri (opsiyonel ama beta hissi için önemli)
  const playAlert = () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const session = await authService.getCurrentSession();
        if (session) {
          setUser(session);
          setLang(session.preferences.language);
          setTheme(session.preferences.theme as 'dark' | 'light');
          const userStats = await authService.getStats(session.id);
          setStats(userStats);
          setView('home');

          if (session.id !== DEMO_USER_ID) {
            const active = await authService.getActiveSession(session.id);
            if (active) {
              setCurrentTask(active.taskTitle);
              setTimeLeft(active.timeRemainingSeconds);
              setSessionDuration(active.durationMinutes * 60);
              setStatus(TimerStatus.PAUSED);
            }
          }
        } else {
          setTimeout(() => setView('welcome'), 1000);
        }
      } catch (e) {
        setView('welcome');
      }
    };
    init();
  }, []);

  // Tercihleri veritabanı ile senkronize et (demo hariç)
  useEffect(() => {
    if (user && view === 'home' && user.id !== DEMO_USER_ID) {
      authService.updatePreferences(user.id, { theme, language: lang, notifications: true });
    }
  }, [theme, lang]);

  // Dönen alıntı: sayaç altındaki alanda; sadece ana ekranda ilerler
  useEffect(() => {
    if (view !== 'home') return;
    const id = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quoteCount(lang));
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [view, lang]);

  // Arkadaş etkinliği: sağ menüde social açıldığında veri çek + gerçek zamanlı güncelleme
  useEffect(() => {
    if (sidebarModule !== 'social' || !user) return;
    
    // İlk yükleme
    setLoadingFriends(true);
    getFriendActivities(user.id, lang)
      .then(setFriendActivities)
      .finally(() => setLoadingFriends(false));
    
    // Gerçek zamanlı güncelleme: her 1 saniyede bir
    const interval = setInterval(() => {
      getFriendActivities(user.id, lang)
        .then(setFriendActivities)
        .catch(err => console.warn('Friend activities update error:', err));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sidebarModule, user?.id, user?.friends?.length, lang]);

  // Hesap: arkadaşlık isteklerini çek
  useEffect(() => {
    if (sidebarModule !== 'account' || !user || user.id === DEMO_USER_ID) return;
    setLoadingRequests(true);
    getIncomingFriendRequests(user.id)
      .then(setIncomingRequests)
      .finally(() => setLoadingRequests(false));
  }, [sidebarModule, user?.id]);

  // Hesap: arkadaşları çek
  useEffect(() => {
    if (sidebarModule !== 'account' || !user || user.id === DEMO_USER_ID) return;
    setLoadingFriendsList(true);
    getFriends(user.id)
      .then(setFriends)
      .finally(() => setLoadingFriendsList(false));
  }, [sidebarModule, user?.id, user?.friends?.length]);

  // Sohbet geçmişi: panel açıldığında listeyi yükle (demo hariç)
  useEffect(() => {
    if (!chatHistoryPanelOpen || !user || user.id === DEMO_USER_ID) return;
    setLoadingChatHistory(true);
    getConversations(user.id)
      .then(setChatConversations)
      .finally(() => setLoadingChatHistory(false));
  }, [chatHistoryPanelOpen, user?.id]);

  // Birlikte Çalış: paired durumunu yükle ve periyodik güncelle (davet kabul edildiğinde widget için)
  useEffect(() => {
    if (!user || user.id === DEMO_USER_ID) return;
    const poll = () => getPairedFriendId(user.id).then((id) => setPairedWithUserId(id));
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Birlikte Çalış: bekleyen davetleri yükle
  useEffect(() => {
    if (!user || user.id === DEMO_USER_ID) return;
    getPendingPairInvites(user.id).then(setPendingPairInvites);
    const id = setInterval(() => getPendingPairInvites(user.id).then(setPendingPairInvites), 3000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Birlikte Çalış: eşleşmiş arkadaşın oturumunu yükle (widget için)
  useEffect(() => {
    if (!user || user.id === DEMO_USER_ID || !pairedWithUserId) {
      setPairedFriendActivity(null);
      return;
    }
    const poll = () => getFriendActivities(user.id, lang).then((activities) => {
      const paired = activities.find((a) => a.id === pairedWithUserId);
      setPairedFriendActivity(paired ?? null);
    });
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [user?.id, pairedWithUserId, lang]);

  // Odalar: myRooms yükle
  useEffect(() => {
    if (sidebarModule !== 'rooms' || !user || user.id === DEMO_USER_ID) return;
    setLoadingRooms(true);
    getMyRooms(user.id).then(setMyRooms).finally(() => setLoadingRooms(false));
  }, [sidebarModule, user?.id]);

  // Odalar: host için room timer tick (active session varsa)
  useEffect(() => {
    if (!currentRoom || !user || user.id === DEMO_USER_ID) return;
    const isHost = currentRoom.hostId === user.id;
    if (!isHost || !currentRoom.activeSession) return;
    const roomId = currentRoom.id;
    const userId = user.id;
    const id = setInterval(() => {
      setRoomSessionTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          playAlert();
          completeRoomSession(roomId, userId).then(() => {
            setRoomSessionTimeLeft(0);
            getRoom(userId, roomId).then(setCurrentRoom);
            authService.getStats(userId).then(setStats);
          });
          return 0;
        }
        updateRoomSession(roomId, userId, next, 'running');
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [currentRoom?.id, currentRoom?.hostId, user?.id, !!currentRoom?.activeSession]);

  // Odalar: currentRoom poll (members için veya room güncellemesi)
  useEffect(() => {
    if (!currentRoom || !user || user.id === DEMO_USER_ID) return;
    const isHost = currentRoom.hostId === user.id;
    if (currentRoom.activeSession && roomSessionTimeLeft === 0) {
      setRoomSessionTimeLeft(currentRoom.activeSession.timeRemainingSeconds);
      setRoomSessionDuration(currentRoom.activeSession.durationMinutes * 60);
    }
    const poll = () => getRoom(user.id, currentRoom.id).then((r) => {
      if (r) setCurrentRoom(r);
      if (r?.activeSession && !isHost) {
        setRoomSessionTimeLeft(r.activeSession.timeRemainingSeconds);
        setRoomSessionDuration(r.activeSession.durationMinutes * 60);
      }
    });
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [currentRoom?.id, user?.id]);

  // Kullanıcı adı kullanılabilirlik (kayıt formu, debounce)
  useEffect(() => {
    if (view !== 'auth' || !registerUsername.trim()) {
      setUsernameStatus('idle');
      return;
    }
    const { ok, error } = validateUsername(registerUsername);
    if (!ok) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    usernameCheckRef.current = setTimeout(async () => {
      usernameCheckRef.current = null;
      const available = await checkUsernameAvailable(registerUsername);
      setUsernameStatus(available ? 'ok' : 'taken');
    }, 400);
    return () => { if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current); };
  }, [view, registerUsername]);

  useEffect(() => {
    if (status === TimerStatus.RUNNING && timeLeft > 0) {
      const interval = testMode ? 1000 : 1000; // Test mode: 1 second = 1 minute (60 seconds)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = testMode ? Math.max(0, prev - 60) : prev - 1; // Test mode: subtract 60 seconds per tick
          // Update active session with current time remaining
          if (user && currentTask && user.id !== DEMO_USER_ID) {
            const durationMins = Math.floor(sessionDuration / 60);
          authService.updateActiveSession(
            user.id,
            currentTask,
            durationMins,
            newTime,
            'running',
            pairedWithUserId ?? undefined
          );
          }
          return newTime;
        });
      }, interval);
      
      // Initialize active session immediately when timer starts
      if (user && currentTask && user.id !== DEMO_USER_ID) {
        const durationMins = Math.floor(sessionDuration / 60);
        authService.updateActiveSession(
          user.id,
          currentTask,
          durationMins,
          timeLeft,
          'running',
          pairedWithUserId ?? undefined
        );
      }
    } else if (timeLeft === 0 && status === TimerStatus.RUNNING) {
      handleComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (user && currentTask && user.id !== DEMO_USER_ID) {
        if (status === TimerStatus.PAUSED) {
          const durationMins = Math.floor(sessionDuration / 60);
          authService.updateActiveSession(user.id, currentTask, durationMins, timeLeft, 'paused', pairedWithUserId ?? undefined);
        } else if (status === TimerStatus.IDLE || status === TimerStatus.COMPLETED) {
          authService.clearActiveSession(user.id);
        }
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, timeLeft, user, currentTask, sessionDuration, pairedWithUserId]);

  const handleComplete = async () => {
    setStatus(TimerStatus.COMPLETED);
    playAlert();
    
    if (user && currentTask) {
      const durationMins = Math.floor(sessionDuration / 60);
      const isDemo = user.id === DEMO_USER_ID;

      if (!isDemo) {
        await authService.saveCompletedSession(user.id, currentTask, durationMins);
        // saveCompletedSession already clears active_sessions
        const newStats = await authService.getStats(user.id);
        setStats(newStats);
      } else {
        setStats(prev => [...prev, { task_title: currentTask, duration_minutes: durationMins, completed_at: new Date().toISOString() }]);
      }

      const updatedTasks = plannedTasks.map((tk) => {
        if (tk.title === currentTask) {
          return { ...tk, completedBlocks: Math.min(tk.completedBlocks + 1, tk.durations.length) };
        }
        return tk;
      });
      setPlannedTasks(updatedTasks);

      let summary: string;
      try {
        summary = isDemo
          ? `[Demo] "${currentTask}" için ${durationMins} dakikalık odak tamamlandı.`
          : await summarizeSession(currentTask, user.field, lang);
      } catch {
        summary = `"${currentTask}" tamamlandı (${durationMins} dk).`;
      }
      const summaryMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: summary, timestamp: Date.now() };
      setChatMessages((prev) => [...prev, summaryMsg]);

      if (currentConversationId && !isDemo) {
        addMessage(currentConversationId, 'assistant', summary);
        updateConversationTasks(currentConversationId, updatedTasks);
      }
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    setIsSyncing(true);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim() ?? '';
    const password = (formData.get('password') as string) ?? '';

    try {
      if (isLogin) {
        const res = await authService.login(email, password);
        if (res.success) {
          setUser(res.user!);
          setLang(res.user!.preferences.language);
          setTheme(res.user!.preferences.theme as 'dark' | 'light');
          const userStats = await authService.getStats(res.user!.id);
          setStats(userStats);
          setView('home');
          const active = await authService.getActiveSession(res.user!.id);
          if (active) {
            setCurrentTask(active.taskTitle);
            setTimeLeft(active.timeRemainingSeconds);
            setSessionDuration(active.durationMinutes * 60);
            setStatus(TimerStatus.PAUSED);
          }
        } else {
          setAuthError(res.error ?? '');
        }
      } else {
        const username = (formData.get('username') as string)?.trim() ?? '';
        const name = (formData.get('name') as string)?.trim() ?? '';
        const field = (formData.get('field') as string)?.trim() ?? '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setAuthError(lang === 'tr' ? 'Geçerli bir e-posta girin.' : 'Enter a valid email.');
          setIsSyncing(false);
          return;
        }
        if (password.length < 6) {
          setAuthError(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.');
          setIsSyncing(false);
          return;
        }
        if (usernameStatus !== 'ok') {
          setAuthError(usernameStatus === 'taken' ? t.usernameTaken : t.usernameInvalid);
          setIsSyncing(false);
          return;
        }
        const res = await authService.register({ email, password, name, field, username });
        if (res.success) {
          setIsLogin(true);
          setRegisterUsername('');
          setUsernameStatus('idle');
          setAuthError(t.authSuccess);
        } else {
          setAuthError(res.error ?? t.authServerError);
        }
      }
    } catch {
      setAuthError(t.authServerError);
    } finally { setIsSyncing(false); }
  };

  const handleDemo = () => {
    setAuthError('');
    setUser(demoUser);
    setView('home');
  };

  const handleAccountSearch = async () => {
    const q = accountSearchQuery.trim();
    if (q.length < 2 || !user || user.id === DEMO_USER_ID) return;
    setAccountSearching(true);
    const list = await searchByUsername(q);
    setAccountSearchResults(list);
    setAccountSearching(false);
  };

  const handleAddFriend = async (toUserId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    setAddingUserId(toUserId);
    const { success, error } = await sendFriendRequest(user.id, toUserId);
    setAddingUserId(null);
    if (success) setAccountSearchResults((prev) => prev.filter((u) => u.id !== toUserId));
    return { success, error };
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    const request = incomingRequests.find((r) => r.id === requestId);
    const { success } = await acceptFriendRequest(requestId, user.id);
    if (success && request) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Update user.friends immediately
      const newFriendId = request.from_user_id;
      setUser((u) => (!u ? u : { ...u, friends: [...u.friends, newFriendId].filter((id, idx, arr) => arr.indexOf(id) === idx) }));
      // Refresh friends list from database
      const updatedFriends = await getFriends(user.id);
      setFriends(updatedFriends);
      // Also refresh user.friends from database to ensure consistency
      const friendIds = await getFriendIds(user.id);
      setUser((u) => (!u ? u : { ...u, friends: friendIds }));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    const { success } = await rejectFriendRequest(requestId, user.id);
    if (success) setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleWorkTogetherInvite = async (friendId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    const { success } = await sendPairInvite(user.id, friendId);
    if (success) {
      setInvitedFriendIds((prev) => [...prev.filter((id) => id !== friendId), friendId]);
    }
  };

  const handleAcceptPairInvite = async (inviteId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    const { success, fromUserId } = await acceptPairInvite(inviteId, user.id);
    if (success) {
      setPairedWithUserId(fromUserId ?? null);
      setPendingPairInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
  };

  const handleRejectPairInvite = async (inviteId: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    await rejectPairInvite(inviteId, user.id);
    setPendingPairInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const handleEndPair = async () => {
    if (!user || user.id === DEMO_USER_ID || !pairedWithUserId) return;
    await endPairWith(user.id, pairedWithUserId);
    setPairedWithUserId(null);
    authService.clearActiveSession(user.id);
  };

  const handleCreateRoom = async () => {
    if (!user || user.id === DEMO_USER_ID) return;
    setRoomError('');
    setRoomCreating(true);
    try {
      const { success, room, error } = await createRoom(user.id, roomCreateTitle, roomCreateDuration);
      if (success && room) {
        const fullRoom = await getRoom(user.id, room.id);
        const roomToSet = fullRoom ?? room;
        setMyRooms((prev) => [roomToSet, ...prev.filter((r) => r.id !== roomToSet.id)]);
        setCurrentRoom(roomToSet);
        setRoomCreateTitle('');
        setRoomCreateDuration(25);
      } else {
        setRoomError(error ?? (lang === 'tr' ? 'Oda oluşturulamadı.' : 'Could not create room.'));
      }
    } finally {
      setRoomCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || user.id === DEMO_USER_ID) return;
    setRoomError('');
    const { success, room, error } = await joinRoomByCode(user.id, roomJoinCode.trim());
    if (success && room) {
      setMyRooms((prev) => [room, ...prev.filter((r) => r.id !== room.id)]);
      setCurrentRoom(room);
      setRoomJoinCode('');
    } else {
      setRoomError(error ?? (lang === 'tr' ? 'Odaya katılınamadı.' : 'Could not join room.'));
    }
  };

  const handleLeaveRoom = async () => {
    if (!user || user.id === DEMO_USER_ID || !currentRoom) return;
    await leaveRoom(user.id, currentRoom.id);
    setMyRooms((prev) => prev.filter((r) => r.id !== currentRoom.id));
    setCurrentRoom(null);
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!user || user.id === DEMO_USER_ID || !currentRoom) return;
    await inviteFriendToRoom(currentRoom.id, user.id, friendId);
    const updated = await getRoom(user.id, currentRoom.id);
    if (updated) setCurrentRoom(updated);
  };

  const handleStartRoomSession = async () => {
    if (!user || user.id === DEMO_USER_ID || !currentRoom || currentRoom.hostId !== user.id) return;
    const task = roomTaskTitle.trim() || (lang === 'tr' ? 'Ortak Görev' : 'Shared Task');
    const { success } = await startRoomSession(currentRoom.id, user.id, task, currentRoom.durationMinutes);
    if (success) {
      const secs = currentRoom.durationMinutes * 60;
      setRoomSessionTimeLeft(secs);
      setRoomSessionDuration(secs);
      setRoomTaskTitle('');
      const updated = await getRoom(user.id, currentRoom.id);
      if (updated) setCurrentRoom(updated);
    }
  };

  const handleCompleteRoomSession = async () => {
    if (!user || user.id === DEMO_USER_ID || !currentRoom || currentRoom.hostId !== user.id) return;
    await completeRoomSession(currentRoom.id, user.id);
    setRoomSessionTimeLeft(0);
    const updated = await getRoom(user.id, currentRoom.id);
    if (updated) setCurrentRoom(updated);
    const newStats = await authService.getStats(user.id);
    setStats(newStats);
  };

  const handleChat = async () => {
    if (!userInput.trim() || isProcessing || !user) return;
    const input = userInput.trim();
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, msg]);
    setUserInput('');
    setIsProcessing(true);

    let convId = currentConversationId;
    const isDemo = user.id === DEMO_USER_ID;

    try {
      if (!convId && !isDemo) {
        const created = await createConversation(user.id);
        if (created) {
          convId = created.id;
          setCurrentConversationId(convId);
        }
      }

      if (convId && !isDemo) {
        await addMessage(convId, 'user', input);
        if (chatMessages.length === 0) {
          generateChatTitle(input, lang).then((title) => updateConversationTitle(convId!, title || t.newChat));
        }
      }

      const res = await suggestPlan(input, chatMessages.map((m) => m.content).join('\n'), `Name: ${user?.name}, Field: ${user?.field}`, lang);
      const isExecute = res.includes('[EXECUTE_BLUEPRINT]');
      const assistantContent = res.replace('[EXECUTE_BLUEPRINT]', '');
      const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: assistantContent, timestamp: Date.now() };
      setChatMessages((prev) => [...prev, assistantMsg]);

      if (convId && !isDemo) {
        await addMessage(convId, 'assistant', assistantContent);
      }

      if (isExecute) {
        const tasks = await finalizeTasks(
          chatMessages.concat(msg).map((m) => m.content).join('\n'),
          user?.field || '',
          lang
        );
        const newTasks = tasks.map((tk) => ({
          ...tk,
          id: crypto.randomUUID(),
          completedBlocks: 0,
          totalMinutes: tk.durations.reduce((a: number, b: number) => a + b, 0),
        }));
        setPlannedTasks(newTasks);
        if (convId && !isDemo) {
          updateConversationTasks(convId, newTasks);
        }
      }

      if (convId && chatHistoryPanelOpen) {
        getConversations(user.id).then(setChatConversations);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setChatMessages([]);
    setPlannedTasks([]);
    setChatHistoryPanelOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    if (!user || user.id === DEMO_USER_ID) return;
    const conv = await getConversation(id, user.id);
    if (!conv || !conv.messages) return;
    setCurrentConversationId(conv.id);
    setChatMessages(conv.messages);
    setPlannedTasks(conv.plannedTasks ?? []);
    setChatHistoryPanelOpen(false);
  };

  const startTask = async (task: PlannedTask) => {
    // FIX: Changed undefined 'tk' to 'task' parameter to resolve reference error.
    if (task.completedBlocks >= task.durations.length) return;
    setCurrentTask(task.title);
    const duration = task.durations[task.completedBlocks] || 25;
    setTimeLeft(duration * 60);
    setSessionDuration(duration * 60);
    setStatus(TimerStatus.IDLE);
    const quote = await getMotivation(task.title, user?.field || "", lang);
    setMotivation(quote);
  };

  if (view === 'splash') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center">
        <div className="w-20 h-20 border-t-2 border-white rounded-full animate-spin"></div>
        <h1 className="mt-8 text-white font-black tracking-widest uppercase text-[10px] animate-pulse">{VERSION.neuralLink}</h1>
      </div>
    );
  }

  if (view === 'welcome') {
    const welcomeTexts = {
      tr: {
        title: 'FoClock AI',
        subtitle: 'Nöral Odak Motoru',
        beta: VERSION.betaLabel,
        betaMessage: '🎯 Özel erişim: Bu beta sürümünü test eden seçili kullanıcılardan birisiniz. Sizin deneyiminiz ve geri bildirimleriniz FoClock AI\'nın geleceğini şekillendiriyor.',
        feature1Title: 'AI Destekli Planlama',
        feature1Desc: 'Fufit AI ile görevlerinizi bilimsel temellere dayalı olarak planlayın ve optimize edin.',
        feature2Title: 'Ultradian Ritimler',
        feature2Desc: '90 dakikalık derin odak blokları ve 20 dakikalık zorunlu resetler ile doğal ritminize uyum sağlayın.',
        feature3Title: 'Flow State Protokolü',
        feature3Desc: 'Bilişsel yük teorisine dayalı sistem ile prefrontal korteksinizi aşırı yükten koruyun.',
        login: 'Giriş Yap',
        register: 'Hesap Oluştur',
        footer: 'Bilimsel temellere dayalı odak yönetimi sistemi'
      },
      en: {
        title: 'FoClock AI',
        subtitle: 'Neural Focus Engine',
        beta: VERSION.betaLabel,
        betaMessage: '🎯 Exclusive Access: You\'re among the select few testing this beta version. Your experience and feedback are shaping the future of FoClock AI.',
        feature1Title: 'AI-Powered Planning',
        feature1Desc: 'Plan and optimize your tasks based on scientific principles with Fufit AI.',
        feature2Title: 'Ultradian Rhythms',
        feature2Desc: 'Align with your natural rhythm with 90-minute deep focus blocks and 20-minute mandatory resets.',
        feature3Title: 'Flow State Protocol',
        feature3Desc: 'Protect your prefrontal cortex from overload with a system based on cognitive load theory.',
        login: 'Sign In',
        register: 'Create Account',
        footer: 'Scientifically based focus management system'
      }
    };
    
    const texts = welcomeTexts[lang];

    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative" data-theme="light">
        {/* Language switcher */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          <button 
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-transparent border border-gray-300 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            {lang === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>

        <div className="max-w-4xl w-full relative z-10 py-4">
          {/* Logo and Title */}
          <div className="text-center mb-6 sm:mb-8 md:mb-10 animate-fade">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-black rounded-2xl text-white font-black text-2xl sm:text-3xl mb-4 sm:mb-6">
              F
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-black mb-2 sm:mb-3 tracking-tight">
              {texts.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 font-medium mb-3 sm:mb-4">
              {texts.subtitle}
            </p>
            <div className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-black text-white rounded-lg mb-3 sm:mb-4">
              <p className="text-xs font-bold">
                {texts.beta}
              </p>
            </div>
            <div className="max-w-lg mx-auto px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                {texts.betaMessage}
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10 animate-fade" style={{animationDelay: '0.2s'}}>
            <div className="p-5 sm:p-6 md:p-8 border border-gray-200 rounded-2xl bg-white hover:border-gray-300 transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-5 sm:h-5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-black mb-2 sm:mb-3">{texts.feature1Title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {texts.feature1Desc}
              </p>
            </div>

            <div className="p-5 sm:p-6 md:p-8 border border-gray-200 rounded-2xl bg-white hover:border-gray-300 transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-5 sm:h-5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-black mb-2 sm:mb-3">{texts.feature2Title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {texts.feature2Desc}
              </p>
            </div>

            <div className="p-5 sm:p-6 md:p-8 border border-gray-200 rounded-2xl bg-white hover:border-gray-300 transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="sm:w-5 sm:h-5">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-black mb-2 sm:mb-3">{texts.feature3Title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {texts.feature3Desc}
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center animate-fade" style={{animationDelay: '0.4s'}}>
            <button 
              onClick={() => { setIsLogin(true); setView('auth'); }} 
              className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-black text-white font-bold rounded-xl text-sm transition-all hover:bg-gray-800 active:scale-98"
            >
              {texts.login}
            </button>
            <button 
              onClick={() => { setIsLogin(false); setView('auth'); }} 
              className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 border border-gray-300 text-black font-bold rounded-xl text-sm transition-all hover:bg-gray-50 active:scale-98"
            >
              {texts.register}
            </button>
          </div>

          {/* Footer info */}
          <div className="mt-6 sm:mt-8 md:mt-10 text-center animate-fade" style={{animationDelay: '0.6s'}}>
            <p className="text-xs text-gray-400">
              {texts.footer}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="h-screen w-screen bg-[var(--bg-app)] overflow-y-auto overscroll-contain">
        {isSyncing && (
          <div className="sync-overlay">
            <div className="loader-dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
          </div>
        )}
        <div className="w-full max-w-[400px] mx-auto pt-4 pb-24 px-4 sm:pt-6 sm:px-5 sm:pb-28">
          <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg-sidebar)] shadow-xl p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={() => setView('welcome')}
              className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-colors"
              aria-label={t.back}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center text-[var(--accent-text)] font-black text-base shadow-md">F</div>
            </div>
            <h1 className="text-xl font-black text-[var(--text-bright)] uppercase tracking-tight text-center mb-5">
              {isLogin ? t.signIn : t.signUp}
            </h1>

            <form onSubmit={handleAuth} className="space-y-3.5">
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="auth-name" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">{t.name}</label>
                    <input id="auth-name" name="name" type="text" required className="input-auth w-full py-2.5" placeholder={t.name} autoComplete="name" />
                  </div>
                  <div>
                    <label htmlFor="auth-field" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">{t.engineeringField}</label>
                    <input id="auth-field" name="field" type="text" required className="input-auth w-full py-2.5" placeholder={t.engineeringField} autoComplete="organization-title" />
                  </div>
                  <div>
                    <label htmlFor="auth-username" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">{t.username}</label>
                    <input
                      id="auth-username"
                      name="username"
                      type="text"
                      required
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="input-auth w-full py-2.5"
                      placeholder={t.usernamePlaceholder}
                      autoComplete="username"
                    />
                    {usernameStatus === 'checking' && <p className="mt-1 text-[10px] text-[var(--text-dim)]">{t.loading}</p>}
                    {usernameStatus === 'ok' && <p className="mt-1 text-[10px] text-[var(--status-flow)] font-medium">✓ {t.usernameAvailable}</p>}
                    {usernameStatus === 'taken' && <p className="mt-1 text-[10px] text-red-500">{t.usernameTaken}</p>}
                    {usernameStatus === 'invalid' && <p className="mt-1 text-[10px] text-red-500">{t.usernameInvalid}</p>}
                  </div>
                </>
              )}

              <div>
                {!isLogin && <label htmlFor="auth-email" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">{t.email}</label>}
                <input id="auth-email" name="email" type="email" required className="input-auth w-full py-2.5" placeholder={t.email} autoComplete="email" />
              </div>
              <div>
                {!isLogin && <label htmlFor="auth-password" className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">{t.password}</label>}
                <div className="relative">
                  <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6} className="input-auth w-full py-2.5 pr-10" placeholder={t.password} autoComplete={isLogin ? 'current-password' : 'new-password'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-all">
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {!isLogin && <p className="mt-1 text-[10px] text-[var(--text-dim)]">{t.passwordHint}</p>}
              </div>

              {authError && (
                <div className={`rounded-lg py-2.5 px-3 text-center text-[10px] font-semibold ${authError === t.authSuccess ? 'bg-[var(--status-flow)]/15 text-[var(--status-flow)]' : 'bg-red-500/10 text-red-500'}`}>
                  {authError}
                </div>
              )}

              <button type="submit" disabled={isSyncing} className="w-full py-3.5 bg-[var(--accent)] text-[var(--accent-text)] font-black rounded-xl uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-[0.99] disabled:opacity-70 transition-all shadow-md mt-1">
                {isLogin ? t.signIn : t.signUp}
              </button>
              <div className="flex flex-col gap-1 pt-0.5">
                <button type="button" onClick={() => { setIsLogin(!isLogin); setAuthError(''); setRegisterUsername(''); setUsernameStatus('idle'); }} className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-bright)] font-medium py-1">
                  {isLogin ? t.signUp : t.signIn}
                </button>
                <button type="button" onClick={handleDemo} className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text-bright)] font-medium py-1 border border-[var(--border)] rounded-lg hover:bg-white/5 transition-colors">
                  {t.demoTry}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const dashOffset = 880 - (880 * timeLeft) / sessionDuration;
  const totalFocusTime = stats.reduce((acc, curr) => acc + curr.duration_minutes, 0);

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar-left relative">
        <div className="sidebar-header flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setChatHistoryPanelOpen((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-bright)]"
            aria-label={t.chatHistory}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-bright)] flex-1 text-center">{t.architectTitle}</span>
          <div className="w-[72px] shrink-0 flex justify-end">
            {!chatHistoryPanelOpen && (
              <button
                type="button"
                onClick={handleNewChat}
                className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-bright)] transition-colors px-2 py-1"
              >
                {t.newChat}
              </button>
            )}
          </div>
        </div>
        {chatHistoryPanelOpen && (
          <div className="absolute left-0 top-[52px] bottom-0 w-[280px] z-30 bg-[var(--bg-sidebar)] border-r border-[var(--border)] shadow-xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[var(--border)] shrink-0">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-bright)]">{t.chatHistory}</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
              {user?.id === DEMO_USER_ID ? (
                <p className="text-[10px] text-[var(--text-dim)] italic px-2 py-4">{t.chatHistoryLoginHint}</p>
              ) : loadingChatHistory ? (
                <p className="text-[10px] text-[var(--text-dim)] italic px-2 py-4">{t.loading}</p>
              ) : chatConversations.length === 0 ? (
                <p className="text-[10px] text-[var(--text-dim)] italic px-2 py-4">{t.noChatsYet}</p>
              ) : (
                chatConversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl mb-1.5 transition-colors text-[10px] ${
                      currentConversationId === c.id
                        ? 'bg-white/10 border border-[var(--text-bright)] text-[var(--text-bright)]'
                        : 'border border-transparent hover:bg-white/5 text-[var(--text-main)]'
                    }`}
                  >
                    <span className="block truncate font-semibold">{c.title || t.newChat}</span>
                    <span className="block text-[9px] text-[var(--text-dim)] mt-0.5">
                      {new Date(c.updatedAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-[var(--border)] shrink-0">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full py-2.5 text-[10px] font-bold uppercase tracking-wider border border-[var(--border)] rounded-xl hover:bg-white/5 transition-colors"
              >
                + {t.newChat}
              </button>
            </div>
          </div>
        )}
        <div className={`chat-section min-h-0 transition-all duration-300 ${queueOpen ? 'flex-[1.5]' : 'flex-1'}`}>
          <div className="chat-history custom-scrollbar pr-2">
            {chatMessages.length === 0 && <div className="text-[10px] text-[var(--text-dim)] italic text-center mt-24 tracking-[0.2em] leading-loose px-6" dangerouslySetInnerHTML={{ __html: `"${t.welcomeQuote}"` }} />}
            {chatMessages.map(m => (
              <div 
                key={m.id} 
                style={m.role === 'assistant' ? {
                  backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: theme === 'dark' ? 'rgba(55, 65, 81, 1)' : 'rgba(229, 231, 235, 1)',
                  color: theme === 'dark' ? 'rgba(243, 244, 246, 1)' : 'rgba(17, 24, 39, 1)',
                } : {}}
                className={`p-5 rounded-3xl text-[12px] leading-relaxed border animate-fade shadow-sm ${
                  m.role === 'assistant' 
                    ? 'max-w-[85%]' 
                    : 'bg-[var(--accent)] text-[var(--accent-text)] ml-auto border-transparent shadow-lg max-w-[75%]'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div 
                    className="space-y-2 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>strong]:font-bold"
                    style={{
                      color: theme === 'dark' ? 'rgba(243, 244, 246, 1)' : 'rgba(17, 24, 39, 1)',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }}
                  />
                ) : (
                  <div>{m.content}</div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="relative mt-4">
            <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} disabled={isProcessing} className="w-full bg-white/5 border border-[var(--border)] rounded-2xl p-5 text-xs outline-none focus:border-[var(--text-bright)] transition-all shadow-inner" placeholder={isProcessing ? t.analyzing : t.architectHint} />
            {isProcessing && <div className="absolute right-5 top-5 w-4 h-4 border-2 border-[var(--text-bright)] border-t-transparent rounded-full animate-spin"></div>}
          </div>
        </div>
        <div className={`queue-section-wrapper flex flex-col border-t border-[var(--border)] bg-[var(--bg-chat)] overflow-hidden transition-all duration-300 ${queueOpen ? 'flex-1 min-h-0' : 'flex-none'}`}>
          <button
            type="button"
            onClick={() => setQueueOpen(!queueOpen)}
            className={`flex items-center justify-between w-full px-5 py-4 text-left hover:bg-white/5 transition-colors ${queueOpen ? 'border-b border-[var(--border)]' : ''}`}
            aria-expanded={queueOpen}
          >
            <h3 className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-[0.3em]">{t.queue}</h3>
            <span className="text-[var(--text-dim)] flex items-center gap-1">
              {plannedTasks.length > 0 && <span className="text-[9px] font-bold bg-[var(--accent)] text-[var(--accent-text)] px-2 py-0.5 rounded-full">{plannedTasks.length}</span>}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-300 ${queueOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </button>
          <div className={`custom-scrollbar overflow-y-auto transition-all duration-300 ${queueOpen ? 'flex-1 min-h-0 opacity-100' : 'max-h-0 opacity-0 overflow-hidden flex-none'}`}>
            <div className="p-5 pt-2 min-h-0">
              {plannedTasks.map(tk => (
                <div key={tk.id} className={`p-5 border rounded-3xl cursor-pointer mb-3 transition-all group ${currentTask === tk.title ? 'border-[var(--text-bright)] bg-white/10' : 'border-[var(--border)] hover:bg-white/5 hover:border-[var(--border-active)]'}`} onClick={() => startTask(tk)}>
                  <div className="flex justify-between font-black text-[10px] uppercase tracking-wider">
                    <span className={tk.completedBlocks >= tk.durations.length ? 'line-through opacity-40' : ''}>{tk.title}</span>
                    <span className="text-[var(--text-dim)]">{tk.totalMinutes}{t.unitMins}</span>
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    {tk.durations.map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < tk.completedBlocks ? 'bg-[var(--status-flow)] shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-[var(--border)]'}`}></div>
                    ))}
                  </div>
                </div>
              ))}
              {plannedTasks.length === 0 && queueOpen && (
                <p className="text-[10px] text-[var(--text-dim)] italic text-center py-8 uppercase tracking-widest">{t.queueEmpty}</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-focus">
        <div className="watermark">{VERSION.watermark}</div>
        <div className="absolute left-1/2 top-[68px] z-10 -translate-x-1/2 text-[11px] font-black uppercase tracking-[0.5em] text-[var(--text-bright)] drop-shadow-sm">{currentTask || "SİSTEM HAZIR"}</div>
        <div className="flex flex-1 flex-col items-center justify-center">
            <div className="timer-container">
                <svg className="ring-svg" viewBox="0 0 320 320">
                  <circle cx="160" cy="160" r="145" fill="transparent" stroke="var(--ring-track)" strokeWidth="1" />
                  <circle cx="160" cy="160" r="145" fill="transparent" stroke="var(--text-bright)" strokeWidth="4" strokeDasharray="911" strokeDashoffset={911 - (911 * timeLeft) / sessionDuration} strokeLinecap="round" className="ring-circle" />
                </svg>
                <div className="absolute inset-0 z-10">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-black tracking-tighter text-[var(--text-bright)] tabular-nums drop-shadow-2xl">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    <div className="absolute top-[82%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
                      <div className={`w-2.5 h-2.5 rounded-full ${status === TimerStatus.RUNNING ? 'bg-[var(--status-flow)] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-[var(--status-idle)]'}`}></div>
                      <span className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-[0.4em]">{t.status[status]}</span>
                    </div>
                </div>
            </div>
            <div key={quoteIndex} className="mt-14 text-[11px] font-medium text-[var(--text-dim)] max-w-sm text-center tracking-widest leading-relaxed min-h-10 px-10 italic animate-fade">{getQuote(lang, quoteIndex)}</div>
        </div>
        <div className="flex gap-12">
            <button onClick={() => {
              if (!currentTask) {
                setCurrentTask(lang === 'tr' ? 'Çalışma Oturumu' : 'Work Session');
              }
              setStatus(status === TimerStatus.RUNNING ? TimerStatus.PAUSED : TimerStatus.RUNNING);
            }} className="w-24 h-24 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-2xl">
                {status === TimerStatus.RUNNING ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={() => { setStatus(TimerStatus.IDLE); setTimeLeft(sessionDuration); }} className="w-24 h-24 rounded-full border-2 border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center hover:text-[var(--text-bright)] hover:border-[var(--text-bright)] active:scale-90 transition-all shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
        </div>
      </main>

      <aside className="right-zone-v2">
<div className="sidebar-header flex justify-between items-center bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-white flex items-center justify-center text-[10px] font-black text-black shadow-sm shrink-0">{(user?.username || user?.name)?.[0]}</div>
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-widest text-[var(--text-bright)] truncate">@{user?.username || 'user'}</div>
              <div className="text-[9px] text-[var(--text-dim)] truncate">{user?.field}</div>
            </div>
          </div>
          <button onClick={() => authService.logout().then(() => { setUser(null); setView('auth'); })} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all shrink-0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
        </div>
         <div className="sidebar-content px-6 py-8">
            {sidebarModule === 'analytics' ? (
               <div className="animate-fade">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[11px] font-black text-[var(--text-dim)] uppercase tracking-widest">NÖRAL VERİLER</h4>
                    <span className="text-[18px] font-black text-[var(--text-bright)]">{totalFocusTime}<span className="text-[10px] text-[var(--text-dim)] ml-1">m</span></span>
                  </div>
                  <div className="space-y-3">
                    {stats.slice(0, 10).map((s, i) => (
                      <div key={i} className="p-4 border border-[var(--border)] rounded-2xl flex justify-between items-center text-[10px] font-bold uppercase bg-white/5 shadow-sm">
                        <div className="flex flex-col">
                          <span className="truncate w-32 text-[var(--text-bright)]">{s.task_title}</span>
                          <span className="text-[8px] text-[var(--text-dim)] mt-1">{new Date(s.completed_at).toLocaleDateString()}</span>
                        </div>
                        <span className="bg-[var(--accent)] text-[var(--accent-text)] px-3 py-1 rounded-full text-[9px]">{s.duration_minutes}m</span>
                      </div>
                    ))}
                    {stats.length === 0 && <div className="py-20 text-center"><p className="text-[10px] italic opacity-40 uppercase tracking-widest">Veri bekleniyor...</p></div>}
                  </div>
                  <button className="w-full mt-8 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>Geri Dön</button>
               </div>
            ) : sidebarModule === 'social' ? (
              <div className="animate-fade">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-[11px] font-black text-[var(--text-dim)] uppercase tracking-widest">{t.social}</h4>
                </div>
                {pendingPairInvites.length > 0 && user?.id !== DEMO_USER_ID && (
                  <div className="mb-6 space-y-2">
                    <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase">{lang === 'tr' ? 'Birlikte çalışma davetleri' : 'Work together invites'}</p>
                    {pendingPairInvites.map((inv) => (
                      <div key={inv.id} className="p-3 border border-[var(--status-flow)] rounded-xl bg-[var(--status-flow)]/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold truncate flex-1">{inv.fromName} {t.pairInviteFrom}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleAcceptPairInvite(inv.id)} className="px-2 py-1 rounded bg-[var(--status-flow)] text-white text-[9px] font-black">{t.pairInviteAccept}</button>
                          <button onClick={() => handleRejectPairInvite(inv.id)} className="px-2 py-1 rounded border border-[var(--border)] text-[9px] font-bold hover:bg-white/5">{t.pairInviteReject}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pairedWithUserId && user?.id !== DEMO_USER_ID && (
                  <div className="mb-6 p-3 border border-[var(--status-flow)] rounded-xl bg-[var(--status-flow)]/10">
                    <p className="text-[10px] font-bold text-[var(--status-flow)] mb-2">{friendActivities.find(a => a.id === pairedWithUserId)?.name ?? friends.find(f => f.id === pairedWithUserId)?.name ?? ''} {t.workingWith}</p>
                    <button onClick={handleEndPair} className="w-full py-2 rounded-lg border border-[var(--border)] text-[9px] font-black uppercase hover:bg-white/5 transition-all">{t.endPair}</button>
                  </div>
                )}
                {loadingFriends ? (
                  <div className="py-20 text-center">
                    <p className="text-[10px] italic opacity-40 uppercase tracking-widest">{t.loading}</p>
                  </div>
                ) : friendActivities.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-[10px] italic opacity-40 uppercase tracking-widest px-4">{t.friendActivityEmpty}</p>
                    <p className="text-[9px] text-[var(--text-dim)] mt-4 opacity-60">{t.noFriends}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendActivities.map((fa) => {
                      const isActive = fa.status === 'flow';
                      const isPaused = fa.status === 'paused';
                      const elapsed = fa.totalDuration > 0 ? Math.floor((fa.totalDuration - fa.timeRemaining) / 60) : 0;
                      const totalMins = Math.floor(fa.totalDuration / 60);
                      const progress = fa.totalDuration > 0 ? (fa.totalDuration - fa.timeRemaining) / fa.totalDuration : 0;
                      
                      // Calculate time ago for inactive sessions (idle only, not paused)
                      let timeAgo = '';
                      if (!isActive && !isPaused && fa.lastSeen) {
                        const lastSeenDate = new Date(fa.lastSeen);
                        const minutesAgo = Math.floor((Date.now() - lastSeenDate.getTime()) / (1000 * 60));
                        if (minutesAgo < 60) {
                          timeAgo = `${minutesAgo}m ago`;
                        } else {
                          const hoursAgo = Math.floor(minutesAgo / 60);
                          timeAgo = `${hoursAgo}h ago`;
                        }
                      }
                      
                      const isPairedWithMe = fa.pairedWith === user?.id;
                      const canWorkTogether = (isActive || isPaused) && !isPairedWithMe && user?.id !== DEMO_USER_ID;
                      const inviteSent = invitedFriendIds.includes(fa.id);
                      return (
                        <div key={fa.id} className="p-2.5 border border-[var(--border)] rounded-xl bg-white/5 relative">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[11px] font-black text-[var(--text-bright)]">
                                {fa.name[0]}
                              </div>
                              {isActive && (
                                <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[var(--status-flow)] animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)] border border-[var(--bg)]"></div>
                              )}
                              {isPaused && (
                                <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-[var(--bg)]"></div>
                              )}
                              {!isActive && !isPaused && fa.lastSeen && (
                                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-orange-500 border border-[var(--bg)]"></div>
                              )}
                              {!isActive && !isPaused && !fa.lastSeen && (
                                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-[var(--text-dim)] border border-[var(--bg)]"></div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="text-[10px] font-black uppercase tracking-tight text-[var(--text-bright)] truncate">{fa.name}</div>
                                <span className="text-[9px] font-bold text-[var(--text-dim)] shrink-0">
                                  {isActive ? `${elapsed}m` : isPaused ? `${t.paused} ${elapsed}m` : totalMins > 0 ? `${totalMins}m` : ''}
                                </span>
                              </div>
                              {isPairedWithMe && (
                                <div className="text-[8px] text-[var(--status-flow)] font-bold mb-1">{fa.name} {t.workingWith}</div>
                              )}
                              <div className="text-[9px] text-[var(--text-dim)] truncate mb-1.5">{fa.activity || (lang === 'tr' ? 'Boş' : 'Empty')}</div>
                              {(isActive || isPaused) && fa.totalDuration > 0 && (
                                <div className="h-0.5 bg-[var(--border)] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[var(--status-flow)] transition-all duration-500"
                                    style={{ width: `${progress * 100}%` }}
                                  ></div>
                                </div>
                              )}
                              {timeAgo && !isActive && !isPaused && (
                                <div className="text-[8px] text-[var(--text-dim)] mt-1">{timeAgo}</div>
                              )}
                              {canWorkTogether && (
                                <button onClick={() => handleWorkTogetherInvite(fa.id)} disabled={inviteSent} className="mt-2 w-full py-1.5 rounded-lg bg-[var(--status-flow)]/20 border border-[var(--status-flow)] text-[var(--status-flow)] text-[9px] font-black uppercase hover:bg-[var(--status-flow)]/30 transition-all disabled:opacity-70">
                                  {inviteSent ? t.inviteSent : t.workTogetherInvite}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button className="w-full mt-8 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>{t.back}</button>
              </div>
            ) : sidebarModule === 'rooms' ? (
              <div className="animate-fade">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[11px] font-black text-[var(--text-dim)] uppercase tracking-widest">{t.rooms}</h4>
                </div>
                {user?.id === DEMO_USER_ID ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] italic opacity-40 uppercase tracking-widest">{t.noRooms}</p>
                    <p className="text-[9px] text-[var(--text-dim)] mt-4 opacity-60">{lang === 'tr' ? 'Giriş yaparak oda oluşturabilir veya katılabilirsiniz.' : 'Sign in to create or join rooms.'}</p>
                    <button className="w-full mt-8 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>{t.back}</button>
                  </div>
                ) : !currentRoom ? (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--text-dim)] mb-1">{t.roomTitle}</label>
                        <input value={roomCreateTitle} onChange={(e) => setRoomCreateTitle(e.target.value)} placeholder={t.roomTitlePlaceholder} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-[10px] outline-none focus:border-[var(--text-bright)]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[var(--text-dim)] mb-1">{t.roomDuration}</label>
                        <input type="number" min={5} max={90} value={roomCreateDuration} onChange={(e) => setRoomCreateDuration(parseInt(e.target.value) || 25)} className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-[10px] outline-none focus:border-[var(--text-bright)]" />
                      </div>
                      {roomError && <p className="text-[10px] text-red-400 mb-2">{roomError}</p>}
                      <button type="button" onClick={handleCreateRoom} disabled={roomCreating} className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-black uppercase disabled:opacity-60 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all">{roomCreating ? (lang === 'tr' ? 'Oluşturuluyor...' : 'Creating...') : t.createRoom}</button>
                    </div>
                    <div className="border-t border-[var(--border)] pt-6 mb-6">
                      <label className="block text-[10px] font-bold uppercase text-[var(--text-dim)] mb-2">{t.joinRoom}</label>
                      <div className="flex gap-2">
                        <input value={roomJoinCode} onChange={(e) => { setRoomJoinCode(e.target.value.toUpperCase()); setRoomError(''); }} placeholder={t.roomCodePlaceholder} maxLength={6} className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-[10px] uppercase outline-none focus:border-[var(--text-bright)]" />
                        <button onClick={handleJoinRoom} disabled={roomJoinCode.trim().length < 4} className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-black uppercase disabled:opacity-40">{t.joinRoom}</button>
                      </div>
                      {roomError && <p className="text-[10px] text-red-400 mt-2">{roomError}</p>}
                    </div>
                    <div className="space-y-2 mb-6">
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase">{t.myRooms}</p>
                      {loadingRooms ? <p className="text-[9px] italic">{t.loading}</p> : myRooms.length === 0 ? <p className="text-[9px] text-[var(--text-dim)]">{t.noRooms}</p> : myRooms.map((r) => (
                        <div key={r.id} className="p-3 border border-[var(--border)] rounded-xl flex justify-between items-center bg-white/5">
                          <div>
                            <div className="text-[10px] font-black truncate">{r.title}</div>
                            <div className="text-[9px] text-[var(--text-dim)]">{r.roomCode} · {r.members?.length ?? 0}/{r.maxMembers}</div>
                          </div>
                          <button onClick={() => setCurrentRoom(r)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[9px] font-bold hover:bg-white/5">{lang === 'tr' ? 'Aç' : 'Open'}</button>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>{t.back}</button>
                  </>
                ) : (
                  <div>
                    <div className="p-4 border border-[var(--border)] rounded-xl bg-white/5 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-[11px] font-black uppercase">{currentRoom.title}</div>
                          <div className="text-[9px] text-[var(--text-dim)] mt-1">{currentRoom.roomCode}</div>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(currentRoom.roomCode); setRoomCodeCopied(true); setTimeout(() => setRoomCodeCopied(false), 2000); }} className="px-2 py-1 rounded text-[9px] font-bold border border-[var(--border)] hover:bg-white/5">{roomCodeCopied ? t.codeCopied : t.copyCode}</button>
                      </div>
                      <div className="text-[9px] text-[var(--text-dim)]">{currentRoom.members?.length ?? 0}/{currentRoom.maxMembers} {lang === 'tr' ? 'üye' : 'members'}</div>
                    </div>
                    {currentRoom.hostId === user?.id && currentRoom.activeSession ? (
                      <div className="p-4 border border-[var(--status-flow)] rounded-xl bg-[var(--status-flow)]/10 mb-4">
                        <div className="text-[10px] font-black text-[var(--status-flow)] mb-2">{currentRoom.activeSession.taskTitle}</div>
                        <div className="text-2xl font-black tabular-nums">{Math.floor(roomSessionTimeLeft / 60)}:{(roomSessionTimeLeft % 60).toString().padStart(2, '0')}</div>
                      </div>
                    ) : currentRoom.activeSession ? (
                      <div className="p-4 border border-[var(--status-flow)] rounded-xl bg-[var(--status-flow)]/10 mb-4">
                        <div className="text-[10px] font-black text-[var(--status-flow)] mb-2">{currentRoom.activeSession.taskTitle}</div>
                        <div className="text-2xl font-black tabular-nums">{Math.floor((currentRoom.activeSession.timeRemainingSeconds) / 60)}:{(currentRoom.activeSession.timeRemainingSeconds % 60).toString().padStart(2, '0')}</div>
                      </div>
                    ) : currentRoom.hostId === user?.id ? (
                      <div className="mb-4">
                        <input value={roomTaskTitle} onChange={(e) => setRoomTaskTitle(e.target.value)} placeholder={t.roomTaskPlaceholder} className="w-full mb-2 bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-[10px] outline-none focus:border-[var(--text-bright)]" />
                        <button onClick={handleStartRoomSession} className="w-full py-3 rounded-xl bg-[var(--status-flow)] text-white text-[10px] font-black uppercase">{t.startSession}</button>
                      </div>
                    ) : null}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2">{t.inviteFriends}</p>
                      {friends.filter((f) => !currentRoom.members?.some((m) => m.userId === f.id)).length === 0 ? (
                        <p className="text-[9px] text-[var(--text-dim)]">{lang === 'tr' ? 'Davet edilebilecek arkadaş yok.' : 'No friends to invite.'}</p>
                      ) : (
                        <div className="space-y-2">
                          {friends.filter((f) => !currentRoom.members?.some((m) => m.userId === f.id)).slice(0, 5).map((f) => (
                            <div key={f.id} className="flex justify-between items-center p-2 border border-[var(--border)] rounded-lg bg-white/5">
                              <span className="text-[10px] font-bold truncate">{f.name}</span>
                              <button onClick={() => handleInviteFriend(f.id)} className="px-2 py-1 rounded text-[9px] font-bold bg-[var(--accent)] text-[var(--accent-text)]">{t.invite}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2">{lang === 'tr' ? 'Üyeler' : 'Members'}</p>
                      <div className="space-y-2">
                        {currentRoom.members?.map((m) => (
                          <div key={m.userId} className="flex items-center gap-2 p-2 border border-[var(--border)] rounded-lg bg-white/5">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-black">{m.name[0]}</div>
                            <span className="text-[10px] font-bold truncate flex-1">{m.name}</span>
                            {m.role === 'host' && <span className="text-[8px] text-[var(--accent)] font-bold">HOST</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleLeaveRoom} className="w-full py-4 border border-red-500/50 rounded-2xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-all">{t.leaveRoom}</button>
                    <button className="w-full mt-4 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setCurrentRoom(null)}>{t.back}</button>
                  </div>
                )}
              </div>
            ) : sidebarModule === 'account' ? (
              <div className="animate-fade">
                <h4 className="text-[11px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-6">{t.socialMenu}</h4>
                {user?.id === DEMO_USER_ID ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] italic opacity-40 uppercase tracking-widest">{t.noFriends}</p>
                    <p className="text-[9px] text-[var(--text-dim)] mt-4 opacity-60">{lang === 'tr' ? 'Giriş yaparak arkadaş ekleyebilirsiniz.' : 'Sign in to add friends.'}</p>
                    <button className="w-full mt-8 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>{t.back}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-6">
                      <input
                        type="text"
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAccountSearch()}
                        placeholder={t.searchUsername}
                        className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-4 py-2.5 text-[10px] outline-none focus:border-[var(--text-bright)] transition-all"
                      />
                      <button type="button" onClick={handleAccountSearch} disabled={accountSearching || accountSearchQuery.trim().length < 2} className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-black uppercase disabled:opacity-40 transition-all">
                        {accountSearching ? '…' : t.search}
                      </button>
                    </div>
                    {accountSearchResults.length > 0 && (
                      <div className="space-y-2 mb-6">
                        {accountSearchResults.map((u) => (
                          <div key={u.id} className="p-3 border border-[var(--border)] rounded-xl flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[10px] font-black text-[var(--text-bright)] shrink-0">{u.name[0]}</div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase truncate">{u.username || u.name}</div>
                                <div className="text-[9px] text-[var(--text-dim)] truncate">{u.name}</div>
                              </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAddFriend(u.id)}
                                disabled={!!addingUserId || user?.friends.includes(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-[9px] font-black uppercase disabled:opacity-40 hover:opacity-90 transition-all shrink-0"
                              >
                                {addingUserId === u.id ? '…' : user?.friends.includes(u.id) ? t.alreadyFriends : t.addFriend}
                              </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-4 border-t border-[var(--border)]">
                      <h5 className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-4">{t.friendRequests}</h5>
                      {loadingRequests ? (
                        <p className="text-[10px] italic opacity-40">{t.loading}</p>
                      ) : incomingRequests.length === 0 ? (
                        <p className="text-[10px] italic opacity-40">{t.noFriendRequests}</p>
                      ) : (
                        <div className="space-y-2">
                          {incomingRequests.map((r) => (
                            <div key={r.id} className="p-3 border border-[var(--border)] rounded-xl flex items-center justify-between bg-white/5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[10px] font-black text-[var(--text-bright)] shrink-0">{(r.from_user?.name ?? '')[0]}</div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-black uppercase truncate">{r.from_user?.username || r.from_user?.name}</div>
                                  <div className="text-[9px] text-[var(--text-dim)] truncate">{r.from_user?.name}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button type="button" onClick={() => handleAcceptRequest(r.id)} className="px-3 py-1.5 rounded-lg bg-[var(--status-flow)]/20 text-[var(--status-flow)] text-[9px] font-black uppercase hover:bg-[var(--status-flow)]/30 transition-all">{t.accept}</button>
                                <button type="button" onClick={() => handleRejectRequest(r.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black uppercase hover:bg-red-500/20 transition-all">{t.reject}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="pt-6 border-t border-[var(--border)] mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest">{t.myFriends}</h5>
                        <span className="text-[9px] font-black text-[var(--text-bright)] bg-white/5 px-2 py-1 rounded-full">{friends.length}</span>
                      </div>
                      {loadingFriendsList ? (
                        <p className="text-[10px] italic opacity-40">{t.loading}</p>
                      ) : friends.length === 0 ? (
                        <p className="text-[10px] italic opacity-40">{t.noFriendsYet}</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {friends.map((f) => (
                            <div key={f.id} className="p-3 border border-[var(--border)] rounded-xl flex items-center gap-3 bg-white/5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[10px] font-black text-[var(--text-bright)] shrink-0">{f.name[0]}</div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-black uppercase truncate">@{f.username || f.name}</div>
                                <div className="text-[9px] text-[var(--text-dim)] truncate">{f.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="w-full mt-8 py-4 border border-[var(--border)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all" onClick={() => setSidebarModule('default')}>{t.back}</button>
                  </>
                )}
              </div>
            ) : sidebarModule === 'settings' ? (
              <div className="animate-fade">
                <h4 className="text-[11px] font-black text-[var(--text-dim)] uppercase tracking-widest mb-8">SİSTEM AYARLARI</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[var(--text-dim)]">Görünüm</span>
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="px-5 py-2 border border-[var(--border)] rounded-xl bg-white/5 text-[10px] font-black uppercase hover:border-[var(--text-bright)] transition-all">{theme}</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[var(--text-dim)]">Dil</span>
                    <button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} className="px-5 py-2 border border-[var(--border)] rounded-xl bg-white/5 text-[10px] font-black uppercase hover:border-[var(--text-bright)] transition-all">{lang}</button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-[var(--text-dim)]">Test Modu</span>
                      <span className="text-[8px] text-[var(--text-dim)] mt-1 opacity-70">{lang === 'tr' ? '1 dakika = 1 saniye' : '1 minute = 1 second'}</span>
                    </div>
                    <button onClick={() => {
                      setTestMode(!testMode);
                      if (status === TimerStatus.RUNNING) {
                        setStatus(TimerStatus.IDLE);
                        setTimeLeft(sessionDuration);
                      }
                    }} className={`px-5 py-2 border rounded-xl text-[10px] font-black uppercase transition-all ${testMode ? 'bg-[var(--status-flow)]/20 border-[var(--status-flow)] text-[var(--status-flow)]' : 'border-[var(--border)] bg-white/5 text-[var(--text-dim)] hover:border-[var(--text-bright)]'}`}>
                      {testMode ? (lang === 'tr' ? 'Aktif' : 'On') : (lang === 'tr' ? 'Kapalı' : 'Off')}
                    </button>
                  </div>
                  <div className="pt-6 border-t border-[var(--border)]">
                     <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">{VERSION.settingsDisplayTR}</span>
                  </div>
                </div>
                <button className="w-full mt-10 py-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg" onClick={() => setSidebarModule('default')}>Tercihleri Uygula</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-fade">
                <nav className="flex flex-col gap-3">
                    <button className="btn-nav py-5 px-6 border border-[var(--border)] rounded-[1.5rem] hover:shadow-md" onClick={() => setSidebarModule('analytics')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      {t.history}
                    </button>
                    <button className="btn-nav py-5 px-6 border border-[var(--border)] rounded-[1.5rem] hover:shadow-md" onClick={() => setSidebarModule('social')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      {t.social}
                    </button>
                    <button className={`btn-nav py-5 px-6 border rounded-[1.5rem] hover:shadow-md ${sidebarModule === 'rooms' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'}`} onClick={() => setSidebarModule('rooms')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      {t.rooms}
                    </button>
                    <button className="btn-nav py-5 px-6 border border-[var(--border)] rounded-[1.5rem] hover:shadow-md" onClick={() => setSidebarModule('account')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t.socialMenu}
                    </button>
                    <button className="btn-nav py-5 px-6 border border-[var(--border)] rounded-[1.5rem] hover:shadow-md" onClick={() => setSidebarModule('settings')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      {t.settings}
                    </button>
                </nav>
              </div>
            )}
         </div>
         <div className="absolute bottom-10 left-0 w-full px-8 opacity-20 hover:opacity-100 transition-all pointer-events-none">
            <div className="text-[8px] font-black uppercase tracking-widest text-center border-t border-[var(--border)] pt-4">Neural Architecture by Fufit AI</div>
         </div>
      </aside>

      {/* Birlikte Çalışma widget - sağ altta partner oturumu */}
      {view === 'home' && pairedWithUserId && pairedFriendActivity && user?.id !== DEMO_USER_ID && (
        <div className="fixed bottom-6 right-6 z-50 w-36 h-36 rounded-full border-2 border-[var(--border)] bg-[var(--bg-sidebar)] shadow-2xl flex flex-col items-center justify-center p-3 animate-fade">
          <div className="text-[8px] font-black uppercase tracking-widest text-[var(--text-dim)] mb-1">{lang === 'tr' ? 'BİRLİKTE ÇALIŞMA' : 'CO-WORKING'}</div>
          <div className="text-[9px] font-bold text-[var(--text-bright)] truncate w-full text-center mb-0.5">{pairedFriendActivity.activity || (lang === 'tr' ? 'Boş' : 'Empty')}</div>
          {pairedFriendActivity.status === 'paused' ? (
            <div className="text-center">
              <div className="text-[10px] font-black text-amber-500 uppercase">{t.paused}</div>
              <div className="text-xl font-black tabular-nums text-[var(--text-bright)]">
                {Math.floor((pairedFriendActivity.totalDuration - pairedFriendActivity.timeRemaining) / 60)}m
              </div>
            </div>
          ) : (
            <div className="text-2xl font-black tabular-nums text-[var(--text-bright)]">
              {Math.floor(pairedFriendActivity.timeRemaining / 60).toString().padStart(2, '0')}:{(pairedFriendActivity.timeRemaining % 60).toString().padStart(2, '0')}
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${pairedFriendActivity.status === 'flow' ? 'bg-[var(--status-flow)] animate-pulse' : pairedFriendActivity.status === 'paused' ? 'bg-amber-500' : 'bg-[var(--text-dim)]'}`}></div>
            <span className="text-[8px] font-black uppercase text-[var(--text-dim)]">
              {pairedFriendActivity.status === 'flow' ? t.status.RUNNING : pairedFriendActivity.status === 'paused' ? t.paused : pairedFriendActivity.status === 'rest' ? t.status.PAUSED : t.status.IDLE}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
