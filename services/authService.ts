
import { createClient } from '@supabase/supabase-js';
import { User, PomodoroSession } from '../types';

const SUPABASE_URL = 'https://rfalpcaqomscnoumnjhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w_e-t5CQ55JxjiOovuYlJg_HSKXvltB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const authService = {
  register: async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    // Metadata ile signUp yap (trigger için name ve field bilgisi)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password!,
      options: {
        data: {
          name: userData.name,
          field: userData.field
        }
      }
    });

    if (authError) return { success: false, error: authError.message };

    // Eğer database trigger kullanıyorsanız, aşağıdaki manuel insert'e gerek yok
    // Trigger otomatik olarak profil oluşturacak
    
    // Trigger yoksa veya trigger başarısız olursa manuel insert (fallback)
    if (authData.user) {
      // Session'ın hazır olmasını bekle (email confirmation kapalıysa session hemen gelir)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Eğer session yoksa, kısa bir süre bekle ve tekrar dene
      if (!session) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Trigger varsa bu insert başarısız olabilir (duplicate key), bu normal
      // Trigger yoksa bu insert çalışacak
      const { error: profileError } = await supabase.from('profiles').insert([
        { 
          id: authData.user.id, 
          name: userData.name, 
          field: userData.field,
          preferences: { theme: 'dark', language: 'tr', notifications: true },
          project_tags: []
        }
      ]).select();
      
      // Sadece gerçek hataları döndür (duplicate key hatası normal, trigger zaten oluşturmuştur)
      if (profileError && !profileError.message.includes('duplicate key') && !profileError.message.includes('violates row-level security')) {
        return { success: false, error: profileError.message };
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

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || data.user.user_metadata?.name || 'User',
      field: profile?.field || data.user.user_metadata?.field || 'General',
      role: 'user',
      friends: [],
      pendingRequests: [],
      projectTags: profile?.project_tags || [],
      preferences: profile?.preferences || { theme: 'dark', language: 'tr', notifications: true }
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

    return {
      id: session.user.id,
      email: session.user.email!,
      name: profile.name,
      field: profile.field,
      role: 'user',
      friends: [],
      pendingRequests: [],
      projectTags: profile.project_tags || [],
      preferences: profile.preferences || { theme: 'dark', language: 'tr', notifications: true }
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
