import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { EventLocation } from '../types';

// Environment variables - these will be set in webpack config
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  location?: EventLocation | string;  // Can be EventLocation object or string for backward compatibility
  attendees: string[];
  is_recurring: boolean;
  recurrence_rule?: string;
  parent_event_id?: string;
  created_at: string;
  updated_at: string;
  source?: 'local' | 'google';
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AppUsage {
  id: string;
  user_id: string;
  app_name: string;
  window_title?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  date: string;
  created_at: string;
}

// Authentication functions
export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    // Create profile if user was created
    if (data.user) {
      await profileService.createProfile(data.user.id, {
        email,
        full_name: fullName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }

    return data;
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'github') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },
};

// Profile service
export const profileService = {
  async createProfile(userId: string, profileData: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: userId, ...profileData }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// Event service
export const eventService = {
  async getEvents(userId: string, startDate?: string, endDate?: string): Promise<Event[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (startDate && endDate) {
      query = query
        .gte('start_time', startDate)
        .lte('end_time', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getRecurringEvents(parentEventId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('parent_event_id', parentEventId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};

// App usage service
export const appUsageService = {
  async saveUsageData(userId: string, usageData: Omit<AppUsage, 'id' | 'user_id' | 'created_at'>[]): Promise<void> {
    const dataWithUserId = usageData.map(usage => ({
      ...usage,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('app_usage')
      .insert(dataWithUserId);

    if (error) throw error;
  },

  async getUsageData(userId: string, startDate: string, endDate: string): Promise<AppUsage[]> {
    const { data, error } = await supabase
      .from('app_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getUsageStats(userId: string, days: number = 7): Promise<Record<string, number>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('app_usage')
      .select('app_name, duration_seconds')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (error) throw error;

    const stats: Record<string, number> = {};
    data?.forEach(entry => {
      if (!stats[entry.app_name]) {
        stats[entry.app_name] = 0;
      }
      stats[entry.app_name] += entry.duration_seconds || 0;
    });

    return stats;
  },
};

// Real-time subscriptions
export const subscriptions = {
  subscribeToEvents(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },

  unsubscribe(subscription: any) {
    supabase.removeChannel(subscription);
  },
};

export default supabase; 