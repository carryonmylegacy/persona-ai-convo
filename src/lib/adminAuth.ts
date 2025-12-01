import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    return data as AdminUser;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

export async function logAdminAction(
  action: string,
  targetUserId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_target_user_id: targetUserId || null,
      p_details: details || {}
    });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (error) {
    console.error('Error in logAdminAction:', error);
  }
}
