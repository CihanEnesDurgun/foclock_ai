import { supabase } from './supabase';

/**
 * Kullanıcı uygulamadayken periyodik çağrılır (heartbeat).
 * profiles.last_seen_at güncellenir; arkadaşlar "son görülme" ve "aktif" görür.
 */
export async function updateLastSeen(): Promise<void> {
  await supabase.rpc('update_last_seen');
}
