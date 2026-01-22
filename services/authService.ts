
import { createClient } from '@supabase/supabase-js';
import { User, PomodoroSession } from '../types';

const SUPABASE_URL = 'https://rfalpcaqomscnoumnjhy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w_e-t5CQ55JxjiOovuYlJg_HSKXvltB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const authService = {
  register: async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password!,
    });

    if (authError) return { success: false, error: authError.message };

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { 
          id: authData.user.id, 
          name: userData.name, 
          field: userData.field,
          preferences: { theme: 'dark', language: 'tr', notifications: true },
          project_tags: []
        }
      ]);
      if (profileError) return { success: false, error: profileError.message };
    }
    return { success: true };
  },

  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name || 'User',
      field: profile?.field || 'General',
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
