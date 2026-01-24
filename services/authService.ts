
import { User } from '../types';
import { supabase } from './supabase';
import { checkUsernameAvailable, validateUsername, getFriendIds } from './friendService';

export const authService = {
  register: async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const username = typeof userData.username === 'string' ? userData.username.trim() : '';
    const { ok: valid, error: validationError } = validateUsername(username);
    if (!valid) return { success: false, error: validationError ?? 'invalid_username' };

    const available = await checkUsernameAvailable(username);
    if (!available) return { success: false, error: 'username_taken' };

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password!,
      options: {
        data: { name: userData.name, field: userData.field, username },
      },
    });

    if (authError) {
      if (authError.status === 500 || authError.message.includes('Internal Server Error')) {
        return { success: false, error: 'Sunucu hatası. Lütfen tekrar deneyin.' };
      }
      return { success: false, error: authError.message };
    }

    if (authData.user) {
      let session = (await supabase.auth.getSession()).data.session;
      if (!session) await new Promise((r) => setTimeout(r, 500));
      session = (await supabase.auth.getSession()).data.session;
      if (session) {
        await supabase.from('profiles').update({
          username,
          username_lower: username.toLowerCase(),
        }).eq('id', authData.user.id);
      }
    }
    return { success: true };
  },

  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Login error:', error);
      
      // Email confirmation hatası için özel mesaj
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return { success: false, error: 'Email adresinizi doğrulamanız gerekiyor. Lütfen e-postanızı kontrol edin.' };
      }
      // Invalid credentials için Türkçe mesaj
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('invalid_credentials') ||
          error.message.includes('Invalid login') ||
          error.status === 400) {
        return { success: false, error: 'Geçersiz e-posta veya şifre. Lütfen bilgilerinizi kontrol edin.' };
      }
      return { success: false, error: error.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.' };
    }

    if (!data.user) {
      return { success: false, error: 'Kullanıcı bilgisi alınamadı.' };
    }

    // Profil bilgisini al (RLS politikası ile korumalı)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Profil yoksa veya okuma hatası varsa, varsayılan değerlerle devam et
    if (profileError && !profileError.message.includes('No rows')) {
      console.warn('Profil okuma hatası:', profileError);
      // Profil okunamazsa bile giriş yapılabilir, varsayılan değerler kullanılır
    }

    const friends = await getFriendIds(data.user.id);
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.user_metadata?.name || 'User',
      username: profile?.username ?? undefined,
      field: profile?.field || data.user.user_metadata?.field || 'General',
      role: 'user',
      friends,
      pendingRequests: [], // filled when opening Account UI
      projectTags: profile?.project_tags || [],
      preferences: profile?.preferences || { theme: 'dark', language: 'tr', notifications: true },
    };
    return { success: true, user };
  },

  updatePreferences: async (userId: string, prefs: any) => {
    await supabase.from('profiles').update({ preferences: prefs }).eq('id', userId);
  },

  getCurrentSession: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (!profile) return null;

    const friends = await getFriendIds(session.user.id);
    return {
      id: session.user.id,
      email: session.user.email!,
      name: profile.name,
      username: profile.username ?? undefined,
      field: profile.field,
      role: 'user',
      friends,
      pendingRequests: [],
      projectTags: profile.project_tags || [],
      preferences: profile.preferences || { theme: 'dark', language: 'tr', notifications: true },
    };
  },

  saveCompletedSession: async (userId: string, title: string, duration: number) => {
    await supabase.from('sessions').insert([{
      user_id: userId,
      task_title: title,
      duration_minutes: duration
    }]);
  },

  getStats: async (userId: string) => {
    const { data } = await supabase.from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    return data || [];
  },

  logout: async () => {
    await supabase.auth.signOut();
  }
};
