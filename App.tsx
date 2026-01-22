
import React, { useState, useEffect, useRef } from 'react';
import { TimerStatus, PomodoroSession, PlannedTask, TimerMode, ChatMessage, User } from './types';
import { suggestPlan, finalizeTasks, getMotivation, summarizeSession } from './services/geminiService';
import { authService } from './services/authService';
import { locales } from './locales';

const App: React.FC = () => {
  const [view, setView] = useState<'splash' | 'auth' | 'home'>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [sidebarModule, setSidebarModule] = useState<'default' | 'analytics' | 'settings'>('default');
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [timeLeft, setTimeLeft] = useState(1500);
  const [sessionDuration, setSessionDuration] = useState(1500);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('');
  const [stats, setStats] = useState<any[]>([]);
  
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
        } else {
          setTimeout(() => setView('auth'), 1000);
        }
      } catch (e) {
        setView('auth');
      }
    };
    init();
  }, []);

  // Tercihleri veritabanı ile senkronize et
  useEffect(() => {
    if (user && view === 'home') {
      authService.updatePreferences(user.id, { theme, language: lang, notifications: true });
    }
  }, [theme, lang]);

  useEffect(() => {
    if (status === TimerStatus.RUNNING && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && status === TimerStatus.RUNNING) {
      handleComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, timeLeft]);

  const handleComplete = async () => {
    setStatus(TimerStatus.COMPLETED);
    playAlert();
    
    if (user && currentTask) {
      const durationMins = Math.floor(sessionDuration / 60);
      await authService.saveCompletedSession(user.id, currentTask, durationMins);
      const newStats = await authService.getStats(user.id);
      setStats(newStats);

      setPlannedTasks(prev => prev.map(tk => {
        if (tk.title === currentTask) {
          return { ...tk, completedBlocks: Math.min(tk.completedBlocks + 1, tk.durations.length) };
        }
        return tk;
      }));
      
      const summary = await summarizeSession(currentTask, user.field, lang);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: summary, timestamp: Date.now() }]);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    setIsSyncing(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

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
        } else setAuthError(res.error!);
      } else {
        const res = await authService.register({
          email, password, 
          name: formData.get('name') as string, 
          field: formData.get('field') as string
        });
        if (res.success) {
          setIsLogin(true);
          setAuthError("Kayıt başarılı. Şimdi giriş yap.");
        } else setAuthError(res.error!);
      }
    } catch (err) {
      setAuthError("Sistem meşgul. Tekrar dene.");
    } finally { setIsSyncing(false); }
  };

  const handleChat = async () => {
    if (!userInput.trim() || isProcessing) return;
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, msg]);
    setUserInput('');
    setIsProcessing(true);
    try {
      const res = await suggestPlan(userInput, chatMessages.map(m => m.content).join('\n'), `Name: ${user?.name}, Field: ${user?.field}`, lang);
      const isExecute = res.includes("[EXECUTE_BLUEPRINT]");
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: res.replace("[EXECUTE_BLUEPRINT]", ""), timestamp: Date.now() }]);
      
      if (isExecute) {
        const tasks = await finalizeTasks(chatMessages.concat(msg).map(m => m.content).join('\n'), user?.field || "", lang);
        setPlannedTasks(tasks.map(tk => ({ 
          ...tk, 
          id: crypto.randomUUID(), 
          completedBlocks: 0, 
          totalMinutes: tk.durations.reduce((a: number, b: number) => a + b, 0) 
        })));
      }
    } finally { setIsProcessing(false); }
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
        <h1 className="mt-8 text-white font-black tracking-widest uppercase text-[10px] animate-pulse">Neural Link v1.0 Beta</h1>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="h-screen w-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
        {isSyncing && <div className="sync-overlay"><div className="loader-dots"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div></div>}
        <div className="max-w-md w-full p-12 border border-[var(--border)] rounded-[3rem] bg-[var(--bg-sidebar)] shadow-2xl transition-all">
          <div className="flex justify-center mb-10">
            <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-[var(--accent-text)] font-black text-xl shadow-xl">F</div>
          </div>
          <h2 className="text-3xl font-black mb-10 text-[var(--text-bright)] uppercase tracking-tighter text-center">{isLogin ? t.signIn : t.signUp}</h2>
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <><input name="name" placeholder={t.name} className="input-auth" required />
              <input name="field" placeholder={t.engineeringField} className="input-auth" required /></>
            )}
            <input name="email" type="email" placeholder={t.email} className="input-auth" required />
            <input name="password" type="password" placeholder={t.password} className="input-auth" required />
            {authError && <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/10 py-2 rounded-lg">{authError}</p>}
            <button type="submit" className="w-full py-5 bg-[var(--accent)] text-[var(--accent-text)] font-black rounded-2xl uppercase text-[11px] tracking-widest transition-all hover:brightness-110 active:scale-[0.98] shadow-lg">{isLogin ? t.signIn : t.signUp}</button>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setAuthError(''); }} className="w-full text-[10px] text-[var(--text-dim)] uppercase font-black hover:text-[var(--text-bright)] py-2">{isLogin ? "HESAP OLUŞTUR" : "GİRİŞ YAP"}</button>
          </form>
        </div>
      </div>
    );
  }

  const dashOffset = 880 - (880 * timeLeft) / sessionDuration;
  const totalFocusTime = stats.reduce((acc, curr) => acc + curr.duration_minutes, 0);

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar-left">
        <div className="sidebar-header"><span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-bright)]">FUFU ARCHITECT</span></div>
        <div className="chat-section">
          <div className="chat-history custom-scrollbar pr-2">
            {chatMessages.length === 0 && <div className="text-[10px] text-[var(--text-dim)] italic text-center mt-24 uppercase tracking-[0.2em] leading-loose px-6">"Zihin dinginleştiğinde, vizyon berraklaşır.<br/>Bugünkü hedefin nedir?"</div>}
            {chatMessages.map(m => (
              <div key={m.id} className={`p-4 rounded-3xl text-[11px] leading-relaxed border animate-fade shadow-sm ${m.role === 'assistant' ? 'bg-white/5 border-[var(--border)]' : 'bg-[var(--accent)] text-[var(--accent-text)] ml-auto border-transparent shadow-lg'}`}>
                {m.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="relative mt-4">
            <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} disabled={isProcessing} className="w-full bg-white/5 border border-[var(--border)] rounded-2xl p-5 text-xs outline-none focus:border-[var(--text-bright)] transition-all shadow-inner" placeholder={isProcessing ? "Nöral analiz yapılıyor..." : t.architectHint} />
            {isProcessing && <div className="absolute right-5 top-5 w-4 h-4 border-2 border-[var(--text-bright)] border-t-transparent rounded-full animate-spin"></div>}
          </div>
        </div>
        <div className="queue-section custom-scrollbar">
          <h3 className="text-[10px] font-black text-[var(--text-dim)] mb-6 uppercase tracking-[0.3em]">{t.queue}</h3>
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
        </div>
      </aside>

      <main className="main-focus">
        <div className="watermark">FUFU NEURAL ENGINE v1.0.b</div>
        <div className="flex flex-col items-center">
            <div className="text-[11px] font-black uppercase tracking-[0.5em] text-[var(--text-bright)] mb-10 h-4 drop-shadow-sm">{currentTask || "SİSTEM HAZIR"}</div>
            <div className="timer-container">
                <svg className="ring-svg" viewBox="0 0 320 320">
                  <circle cx="160" cy="160" r="145" fill="transparent" stroke="var(--ring-track)" strokeWidth="1" />
                  <circle cx="160" cy="160" r="145" fill="transparent" stroke="var(--text-bright)" strokeWidth="4" strokeDasharray="911" strokeDashoffset={911 - (911 * timeLeft) / sessionDuration} strokeLinecap="round" className="ring-circle" />
                </svg>
                <div className="timer-text">
                    <span className="text-9xl font-black tracking-tighter text-[var(--text-bright)] tabular-nums drop-shadow-2xl">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    <div className="flex items-center gap-3 mt-8 bg-white/5 px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
                      <div className={`w-2.5 h-2.5 rounded-full ${status === TimerStatus.RUNNING ? 'bg-[var(--status-flow)] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-[var(--status-idle)]'}`}></div>
                      <span className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-[0.4em]">{t.status[status]}</span>
                    </div>
                </div>
            </div>
            <div className="mt-14 text-[11px] font-medium text-[var(--text-dim)] max-w-sm text-center uppercase tracking-widest leading-relaxed h-10 px-10 italic">"{motivation}"</div>
        </div>
        <div className="flex gap-12">
            <button onClick={() => setStatus(status === TimerStatus.RUNNING ? TimerStatus.PAUSED : TimerStatus.RUNNING)} className="w-24 h-24 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-2xl disabled:opacity-20" disabled={!currentTask}>
                {status === TimerStatus.RUNNING ? <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={() => { setStatus(TimerStatus.IDLE); setTimeLeft(sessionDuration); }} className="w-24 h-24 rounded-full border-2 border-[var(--border)] text-[var(--text-dim)] flex items-center justify-center hover:text-[var(--text-bright)] hover:border-[var(--text-bright)] active:scale-90 transition-all shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
        </div>
      </main>

      <aside className="right-zone-v2">
         <div className="sidebar-header flex justify-between items-center bg-white/5 backdrop-blur-md">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-white flex items-center justify-center text-[10px] font-black text-black shadow-sm">{user?.name[0]}</div>
             <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-bright)]">{user?.name}</h3>
           </div>
           <button onClick={() => authService.logout().then(() => setView('auth'))} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>
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
                  <div className="pt-6 border-t border-[var(--border)]">
                     <span className="text-[8px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Sürüm: FoClock AI Neural Beta 1.0</span>
                  </div>
                </div>
                <button className="w-full mt-10 py-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg" onClick={() => setSidebarModule('default')}>Tercihleri Uygula</button>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-fade">
                <div className="p-8 border border-[var(--border)] rounded-[2.5rem] bg-gradient-to-br from-white/5 to-transparent shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-[var(--accent)] opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-all"></div>
                    <div className="text-[10px] font-black text-[var(--text-dim)] mb-3 uppercase tracking-[0.3em]">Cognitive Specialization</div>
                    <div className="text-sm font-black uppercase text-[var(--text-bright)] tracking-tight">{user?.field}</div>
                </div>
                <nav className="flex flex-col gap-3">
                    <button className="btn-nav py-5 px-6 border border-[var(--border)] rounded-[1.5rem] hover:shadow-md" onClick={() => setSidebarModule('analytics')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      {t.history}
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
            <div className="text-[8px] font-black uppercase tracking-widest text-center border-t border-[var(--border)] pt-4">Neural Architecture by Fufu AI</div>
         </div>
      </aside>
      <div className="footer-bar"><span>BETA ACCESS: AUTHORIZED // NETWORK: STABLE // ENCRYPTION: 256-BIT AES</span></div>
    </div>
  );
};

export default App;
