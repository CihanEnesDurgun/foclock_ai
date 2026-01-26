import { User } from '../types';
import { supabase } from './supabase';
import { checkUsernameAvailable, validateUsername, getFriendIds } from './friendService';

const DEFAULT_PREFS = { theme: 'dark' as const, language: 'tr' as const, notifications: true };

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
    });

    if (authError) {
      if (authError.status === 500 || /internal|server error/i.test(authError.message))
        return { success: false, error: 'Sunucu hatası. Lütfen tekrar deneyin.' };
      return { success: false, error: authError.message };
    }

    if (!authData.user) return { success: false, error: 'Hesap oluşturulamadı.' };

    let session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      await new Promise((r) => setTimeout(r, 600));
      session = (await supabase.auth.getSession()).data.session;
    }

    // Email confirmation açıksa session olmayabilir; yine de profil oluşturmayı dene
    // RLS için SECURITY DEFINER fonksiyonu kullanacağız veya service role key gerekebilir
    // Şimdilik: session varsa normal insert, yoksa RPC ile insert dene
    let profileInserted = false;
    
    if (session) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: userData.email ?? authData.user.email ?? null,
        name: userData.name || 'User',
        field: userData.field || 'General',
        username,
        username_lower: username.toLowerCase(),
        preferences: DEFAULT_PREFS,
        project_tags: [],
      });

      if (profileError) {
        console.error('[authService] Profile insert failed (with session):', profileError);
        // RLS hatası olabilir; RPC ile dene
      } else {
        profileInserted = true;
      }
    }

    // Session yoksa veya insert başarısızsa RPC ile dene
    if (!profileInserted) {
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        p_user_id: authData.user.id,
        p_email: userData.email ?? authData.user.email ?? null,
        p_name: userData.name || 'User',
        p_field: userData.field || 'General',
        p_username: username,
        p_username_lower: username.toLowerCase(),
        p_preferences: DEFAULT_PREFS,
        p_project_tags: [],
      });

      if (rpcError) {
        console.error('[authService] Profile RPC insert failed:', rpcError);
        // RPC yoksa manuel insert dene (anon key ile, RLS bypass için)
        // Son çare: kullanıcıya email confirmation sonrası profil oluşturulacağını söyle
        if (!session) {
          return { 
            success: false, 
            error: 'Kayıt başarılı ancak profil oluşturulamadı. E-posta doğrulamasından sonra tekrar giriş yapın veya destek ile iletişime geçin.' 
          };
        }
        if (/duplicate|unique|already exists/i.test(rpcError.message))
          return { success: false, error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' };
        return { success: false, error: `Profil kaydedilemedi: ${rpcError.message}` };
      }
    }

    return { success: true };
  },

  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (/email not confirmed|email_not_confirmed/i.test(error.message))
        return { success: false, error: 'E-posta doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.' };
      if (/invalid login|invalid_credentials/i.test(error.message) || error.status === 400)
        return { success: false, error: 'Geçersiz e-posta veya şifre.' };
      if (/rate limit|email rate limit/i.test(error.message))
        return { success: false, error: 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.' };
      return { success: false, error: error.message || 'Giriş yapılamadı.' };
    }

    if (!data.user) return { success: false, error: 'Kullanıcı bilgisi alınamadı.' };

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      const meta = data.user.user_metadata ?? {};
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? null,
        name: meta.name ?? meta.full_name ?? 'User',
        field: meta.field ?? 'General',
        username: meta.username ?? null,
        username_lower: meta.username ? String(meta.username).toLowerCase() : null,
        preferences: meta.preferences ?? DEFAULT_PREFS,
        project_tags: meta.project_tags ?? [],
      }, { onConflict: 'id' });
      if (upsertErr) console.error('[authService] Profile upsert on login failed:', upsertErr);
      const { data: refreshed } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      profile = refreshed ?? undefined;
    }

    const friends = await getFriendIds(data.user.id);
    const user: User = {
      id: data.user.id,
      email: data.user.email!,
      name: profile?.name ?? data.user.user_metadata?.name ?? 'User',
      username: profile?.username ?? undefined,
      field: profile?.field ?? data.user.user_metadata?.field ?? 'General',
      role: 'user',
      friends,
      pendingRequests: [],
      projectTags: profile?.project_tags ?? [],
      preferences: profile?.preferences ?? DEFAULT_PREFS,
    };
    return { success: true, user };
  },

  updatePreferences: async (userId: string, prefs: object) => {
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
      projectTags: profile.project_tags ?? [],
      preferences: profile.preferences ?? DEFAULT_PREFS,
    };
  },

  saveCompletedSession: async (userId: string, title: string, duration: number) => {
    await supabase.from('sessions').insert({ user_id: userId, task_title: title, duration_minutes: duration });
  },

  getStats: async (userId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    return data ?? [];
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
};
