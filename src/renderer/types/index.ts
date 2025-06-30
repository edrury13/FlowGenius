// Global type definitions for FlowGenius

// Re-export types from services
export type { Event, Profile, AppUsage } from '../services/supabase';
export type { NotificationOptions, NotificationAction, EventReminder } from '../services/notifications';

// Calendar view types
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

// Event form data
export interface EventFormData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  isRecurring: boolean;
  recurrenceRule?: string;
}

// Recurrence options
export interface RecurrenceOptions {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  dayOfMonth?: number;
  monthOfYear?: number;
}

// App usage statistics
export interface UsageStats {
  appName: string;
  totalTime: number; // in seconds
  percentage: number;
  sessions: number;
  averageSessionTime: number;
}

export interface DailyUsageStats {
  date: string;
  totalActiveTime: number;
  topApps: UsageStats[];
  productivityScore: number;
  focusTime: number;
  distractionTime: number;
}

// Productivity insights
export interface ProductivityInsight {
  id: string;
  type: 'tip' | 'warning' | 'achievement' | 'suggestion';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    text: string;
    handler: () => void;
  };
  timestamp: Date;
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  user: any | null; // Supabase User type
  loading: boolean;
  error: string | null;
}

// Application state
export interface AppState {
  currentView: CalendarView;
  selectedDate: Date;
  events: Event[];
  loading: boolean;
  error: string | null;
}

// Settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultView: CalendarView;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  workingHours: {
    start: string; // HH:mm format
    end: string;
  };
  reminderDefaults: number[]; // minutes before event
  notifications: {
    enabled: boolean;
    eventReminders: boolean;
    productivityInsights: boolean;
    dailySummary: boolean;
  };
  privacy: {
    appTracking: boolean;
    dataSharing: boolean;
  };
  autoStartup: boolean;
  minimizeToTray: boolean;
}

// Component props
export interface CalendarProps {
  events: Event[];
  view: CalendarView;
  date: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onEventSelect: (event: Event) => void;
  onEventCreate: (start: Date, end: Date) => void;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

export interface EventModalProps {
  event?: Event;
  open: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => void;
  onDelete?: (eventId: string) => void;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Search types
export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  attendees?: string[];
  location?: string;
}

export interface SearchResult {
  events: Event[];
  totalCount: number;
  hasMore: boolean;
}

// Export/Import types
export interface ExportOptions {
  format: 'json' | 'csv' | 'ical';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeRecurring: boolean;
}

// Window API extension for Electron is defined in preload.ts 